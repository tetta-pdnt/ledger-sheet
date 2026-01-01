'use client';

import { useState } from 'react';
import { FolderOpen, Save, RotateCcw, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useLedgerStore } from '@/lib/store';
import { toast } from 'sonner';

export default function SettingsPage() {
  const {
    isLoaded,
    isLoading,
    settings,
    loadAllData,
    saveSettings,
    reset,
  } = useLedgerStore();

  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleReload = async () => {
    await loadAllData();
    toast.success('データを再読み込みしました');
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveSettings();
      toast.success('設定を保存しました');
    } catch (error) {
      toast.error('設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('すべてのデータをリセットしますか？保存されていない変更は失われます。')) {
      reset();
      toast.success('データをリセットしました');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="設定" showMonthPicker={false} />

      <div className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>データフォルダ</CardTitle>
            <CardDescription>
              データはプロジェクト配下の <code className="bg-muted px-1 rounded">data</code> ディレクトリに保存されます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={handleReload} disabled={isLoading} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? '読み込み中...' : 'データを再読み込み'}
              </Button>
              {isLoaded && (
                <span className="text-sm text-green-600">読み込み済み</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              以下のファイルが保存されます:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              <li>categories.yaml - カテゴリ設定</li>
              <li>accounts.yaml - 口座設定</li>
              <li>budgets.yaml - 予算設定</li>
              <li>recurrings.yaml - 定期項目</li>
              <li>settings.yaml - アプリ設定</li>
              <li>transactions/YYYY-MM.yaml - 月別取引データ</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>表示設定</CardTitle>
            <CardDescription>
              アプリの表示に関する設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>テーマ</Label>
                <Select
                  value={localSettings.theme}
                  onValueChange={(v) =>
                    setLocalSettings({ ...localSettings, theme: v as 'light' | 'dark' | 'system' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">システム設定に従う</SelectItem>
                    <SelectItem value="light">ライト</SelectItem>
                    <SelectItem value="dark">ダーク</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>通貨</Label>
                <Select
                  value={localSettings.currency}
                  onValueChange={(v) =>
                    setLocalSettings({ ...localSettings, currency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">日本円 (¥)</SelectItem>
                    <SelectItem value="USD">米ドル ($)</SelectItem>
                    <SelectItem value="EUR">ユーロ (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>日付形式</Label>
                <Select
                  value={localSettings.dateFormat}
                  onValueChange={(v) =>
                    setLocalSettings({ ...localSettings, dateFormat: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yyyy-MM-dd">2024-12-31</SelectItem>
                    <SelectItem value="yyyy/MM/dd">2024/12/31</SelectItem>
                    <SelectItem value="MM/dd/yyyy">12/31/2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>週の開始日</Label>
                <Select
                  value={localSettings.firstDayOfWeek.toString()}
                  onValueChange={(v) =>
                    setLocalSettings({ ...localSettings, firstDayOfWeek: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">日曜日</SelectItem>
                    <SelectItem value="1">月曜日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <Button onClick={handleSaveSettings} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '設定を保存'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">危険な操作</CardTitle>
            <CardDescription>
              これらの操作は取り消すことができません
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              すべてのデータをリセット
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
