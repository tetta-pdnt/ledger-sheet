'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, ChevronRight, ChevronDown } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColorPicker } from '@/components/ui/color-picker';
import { useLedgerStore } from '@/lib/store';
import { generateCategoryId } from '@/lib/utils';
import type { Category, Subcategory } from '@/lib/schemas';

type CategoryType = 'income' | 'expense';

interface CategoryFormData {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SubcategoryFormData {
  id: string;
  name: string;
  startMonth: string;
  endMonth: string;
}

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useLedgerStore();

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [subcategoryFormOpen, setSubcategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ type: CategoryType; category: Category } | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{
    type: CategoryType;
    categoryId: string;
    subcategory: Subcategory;
  } | null>(null);
  const [parentCategory, setParentCategory] = useState<{ type: CategoryType; categoryId: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<CategoryFormData>({
    id: '',
    name: '',
    icon: 'circle',
    color: '#6B7280',
  });

  const [subFormData, setSubFormData] = useState<SubcategoryFormData>({
    id: '',
    name: '',
    startMonth: '',
    endMonth: '',
  });

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddCategory = (type: CategoryType) => {
    setEditingCategory(null);
    setFormData({ id: '', name: '', icon: 'circle', color: '#6B7280' });
    setCategoryFormOpen(true);
  };

  const handleEditCategory = (type: CategoryType, category: Category) => {
    setEditingCategory({ type, category });
    setFormData({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
    setCategoryFormOpen(true);
  };

  const handleDeleteCategory = (type: CategoryType, categoryId: string) => {
    if (confirm('このカテゴリを削除しますか？')) {
      deleteCategory(type, categoryId);
    }
  };

  const handleAddSubcategory = (type: CategoryType, categoryId: string) => {
    setEditingSubcategory(null);
    setParentCategory({ type, categoryId });
    setSubFormData({ id: '', name: '', startMonth: '', endMonth: '' });
    setSubcategoryFormOpen(true);
  };

  const handleEditSubcategory = (
    type: CategoryType,
    categoryId: string,
    subcategory: Subcategory
  ) => {
    setEditingSubcategory({ type, categoryId, subcategory });
    setParentCategory({ type, categoryId });
    setSubFormData({
      id: subcategory.id,
      name: subcategory.name,
      startMonth: subcategory.startMonth || '',
      endMonth: subcategory.endMonth || '',
    });
    setSubcategoryFormOpen(true);
  };

  const handleDeleteSubcategory = (
    type: CategoryType,
    categoryId: string,
    subcategoryId: string
  ) => {
    if (confirm('このサブカテゴリを削除しますか？')) {
      const categoryList = type === 'income' ? categories.categories.income : categories.categories.expense;
      const category = categoryList.find((c) => c.id === categoryId);
      if (category) {
        const updatedSubcategories = category.subcategories.filter(
          (s) => s.id !== subcategoryId
        );
        updateCategory(type, categoryId, { subcategories: updatedSubcategories });
      }
    }
  };

  const handleCategorySubmit = (e: React.FormEvent, type: CategoryType) => {
    e.preventDefault();

    const categoryData: Category = {
      id: editingCategory ? formData.id : generateCategoryId(formData.name),
      name: formData.name,
      icon: formData.icon,
      color: formData.color,
      subcategories: editingCategory ? editingCategory.category.subcategories : [],
    };

    if (editingCategory) {
      updateCategory(editingCategory.type, editingCategory.category.id, categoryData);
    } else {
      addCategory(type, categoryData);
    }

    setCategoryFormOpen(false);
  };

  const handleSubcategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentCategory) return;

    const { type, categoryId } = parentCategory;
    const categoryList = type === 'income' ? categories.categories.income : categories.categories.expense;
    const category = categoryList.find((c) => c.id === categoryId);
    if (!category) return;

    const newSubcategory: Subcategory = {
      id: editingSubcategory ? subFormData.id : generateCategoryId(subFormData.name),
      name: subFormData.name,
      ...(subFormData.startMonth && { startMonth: subFormData.startMonth }),
      ...(subFormData.endMonth && { endMonth: subFormData.endMonth }),
    };

    let updatedSubcategories: Subcategory[];
    if (editingSubcategory) {
      updatedSubcategories = category.subcategories.map((s) =>
        s.id === editingSubcategory.subcategory.id ? newSubcategory : s
      );
    } else {
      updatedSubcategories = [...category.subcategories, newSubcategory];
    }

    updateCategory(type, categoryId, { subcategories: updatedSubcategories });
    setSubcategoryFormOpen(false);
  };

  const renderCategoryList = (type: CategoryType, categoryList: Category[]) => (
    <div className="space-y-2">
      {categoryList.map((category) => (
        <div key={category.id} className="border rounded-lg">
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
            onClick={() => toggleExpanded(category.id)}
          >
            <div className="flex items-center gap-3">
              {category.subcategories.length > 0 ? (
                expandedCategories.has(category.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              ) : (
                <div className="w-4" />
              )}
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="font-medium">{category.name}</span>
              <span className="text-sm text-muted-foreground">
                ({category.subcategories.length} サブカテゴリ)
              </span>
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAddSubcategory(type, category.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditCategory(type, category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteCategory(type, category.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {expandedCategories.has(category.id) && category.subcategories.length > 0 && (
            <div className="border-t bg-muted/50 p-2 space-y-1">
              {category.subcategories.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between pl-8 pr-2 py-2 rounded hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{sub.name}</span>
                    {(sub.startMonth || sub.endMonth) && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {sub.startMonth && sub.endMonth
                          ? `${sub.startMonth} 〜 ${sub.endMonth}`
                          : sub.startMonth
                            ? `${sub.startMonth} 〜`
                            : `〜 ${sub.endMonth}`
                        }
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditSubcategory(type, category.id, sub)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteSubcategory(type, category.id, sub.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="カテゴリ" showMonthPicker={false} />

      <div className="flex-1 p-6">
        <Tabs defaultValue="expense">
          <TabsList className="mb-4">
            <TabsTrigger value="expense">支出</TabsTrigger>
            <TabsTrigger value="income">収入</TabsTrigger>
          </TabsList>

          <TabsContent value="expense">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>支出カテゴリ</CardTitle>
                <Button onClick={() => handleAddCategory('expense')}>
                  <Plus className="h-4 w-4 mr-2" />
                  追加
                </Button>
              </CardHeader>
              <CardContent>
                {renderCategoryList('expense', categories.categories.expense)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>収入カテゴリ</CardTitle>
                <Button onClick={() => handleAddCategory('income')}>
                  <Plus className="h-4 w-4 mr-2" />
                  追加
                </Button>
              </CardHeader>
              <CardContent>
                {renderCategoryList('income', categories.categories.income)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={categoryFormOpen} onOpenChange={setCategoryFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'カテゴリを編集' : '新規カテゴリ'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) =>
              handleCategorySubmit(e, editingCategory?.type || 'expense')
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="カテゴリ名"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>色</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      className="w-12 rounded border"
                      style={{ backgroundColor: formData.color }}
                    />
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-3">
                    <ColorPicker
                      value={formData.color}
                      onChange={(color) =>
                        setFormData({ ...formData, color })
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryFormOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">{editingCategory ? '更新' : '追加'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={subcategoryFormOpen} onOpenChange={setSubcategoryFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? 'サブカテゴリを編集' : '新規サブカテゴリ'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubcategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={subFormData.name}
                onChange={(e) => setSubFormData({ ...subFormData, name: e.target.value })}
                placeholder="サブカテゴリ名"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始月</Label>
                <Input
                  type="month"
                  value={subFormData.startMonth}
                  onChange={(e) => setSubFormData({ ...subFormData, startMonth: e.target.value })}
                  placeholder="YYYY-MM"
                />
                <p className="text-xs text-muted-foreground">空欄 = 最初から有効</p>
              </div>
              <div className="space-y-2">
                <Label>終了月</Label>
                <Input
                  type="month"
                  value={subFormData.endMonth}
                  onChange={(e) => setSubFormData({ ...subFormData, endMonth: e.target.value })}
                  placeholder="YYYY-MM"
                />
                <p className="text-xs text-muted-foreground">空欄 = 無期限</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubcategoryFormOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">
                {editingSubcategory ? '更新' : '追加'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
