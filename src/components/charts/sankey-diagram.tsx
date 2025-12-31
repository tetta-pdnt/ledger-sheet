'use client';

import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { SankeyNode, SankeyLink } from '@/lib/sankey';
import { formatCurrency } from '@/lib/utils';

interface SankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
}

interface D3SankeyNode extends SankeyNode {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface D3SankeyLink {
  source: D3SankeyNode;
  target: D3SankeyNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

export function SankeyDiagram({
  nodes,
  links,
  width = 800,
  height = 500,
}: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const processedData = useMemo(() => {
    if (nodes.length === 0 || links.length === 0) {
      return null;
    }

    // Create node index map
    const nodeById = new Map(nodes.map((n, i) => [n.id, i]));

    // Prepare data for d3-sankey
    const sankeyNodes = nodes.map((n) => ({ ...n }));
    const sankeyLinks = links
      .filter((l) => nodeById.has(l.source) && nodeById.has(l.target))
      .map((l) => ({
        source: nodeById.get(l.source)!,
        target: nodeById.get(l.target)!,
        value: l.value,
      }));

    if (sankeyLinks.length === 0) {
      return null;
    }

    // Create sankey generator
    const sankeyGenerator = sankey<
      { id: string; name: string; type: string; color: string; index?: number },
      { source: number; target: number; value: number }
    >()
      .nodeId((d) => d.index ?? 0)
      .nodeWidth(20)
      .nodePadding(15)
      .extent([
        [40, 20],
        [width - 40, height - 20],
      ]);

    // Add index to nodes
    const indexedNodes = sankeyNodes.map((n, i) => ({ ...n, index: i }));

    return sankeyGenerator({
      nodes: indexedNodes,
      links: sankeyLinks,
    });
  }, [nodes, links, width, height]);

  useEffect(() => {
    if (!svgRef.current || !processedData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { nodes: layoutNodes, links: layoutLinks } = processedData;

    // Create gradient definitions
    const defs = svg.append('defs');

    layoutLinks.forEach((link, i) => {
      const gradient = defs
        .append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', (link.source as D3SankeyNode).x1!)
        .attr('x2', (link.target as D3SankeyNode).x0!);

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', (link.source as D3SankeyNode).color);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', (link.target as D3SankeyNode).color);
    });

    // Draw links
    svg
      .append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(layoutLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (_, i) => `url(#gradient-${i})`)
      .attr('stroke-width', (d) => Math.max(1, (d as D3SankeyLink).width || 0))
      .attr('opacity', 0.5)
      .on('mouseover', function () {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.5);
      })
      .append('title')
      .text(
        (d) =>
          `${(d.source as D3SankeyNode).name} → ${(d.target as D3SankeyNode).name}\n${formatCurrency(d.value)}`
      );

    // Draw nodes
    svg
      .append('g')
      .selectAll('rect')
      .data(layoutNodes)
      .join('rect')
      .attr('x', (d) => (d as D3SankeyNode).x0!)
      .attr('y', (d) => (d as D3SankeyNode).y0!)
      .attr('height', (d) => (d as D3SankeyNode).y1! - (d as D3SankeyNode).y0!)
      .attr('width', (d) => (d as D3SankeyNode).x1! - (d as D3SankeyNode).x0!)
      .attr('fill', (d) => (d as D3SankeyNode).color)
      .attr('rx', 3)
      .append('title')
      .text((d) => `${(d as D3SankeyNode).name}`);

    // Draw labels
    svg
      .append('g')
      .style('font-size', '12px')
      .selectAll('text')
      .data(layoutNodes)
      .join('text')
      .attr('x', (d) => {
        const node = d as D3SankeyNode;
        return node.x0! < width / 2 ? node.x1! + 6 : node.x0! - 6;
      })
      .attr('y', (d) => ((d as D3SankeyNode).y0! + (d as D3SankeyNode).y1!) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) =>
        (d as D3SankeyNode).x0! < width / 2 ? 'start' : 'end'
      )
      .attr('fill', 'currentColor')
      .text((d) => (d as D3SankeyNode).name);
  }, [processedData, width, height]);

  if (!processedData) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ width, height }}
      >
        <p>表示するデータがありません</p>
      </div>
    );
  }

  return <svg ref={svgRef} width={width} height={height} />;
}
