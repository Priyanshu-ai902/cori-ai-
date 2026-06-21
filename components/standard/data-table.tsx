import React from 'react'
import { cn } from '@/lib/utils'

interface DataTableProps {
  columns: {
    header: string
    key: string
    className?: string
    render?: (row: any) => React.ReactNode
  }[]
  data: any[]
  onRowClick?: (row: any) => void
  emptyState?: React.ReactNode
  className?: string
}

export function DataTable({ columns, data, onRowClick, emptyState, className }: DataTableProps) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/30", className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            {columns.map((col, i) => (
              <th key={i} className={cn("px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {data.length > 0 ? data.map((row, i) => (
            <tr 
              key={i} 
              onClick={() => onRowClick?.(row)}
              className={cn(
                "hover:bg-zinc-800/50 transition-colors group",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col, j) => (
                <td key={j} className={cn("px-4 py-3 text-sm text-zinc-300", col.className)}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {emptyState || (
                  <div className="py-12 text-center text-zinc-500 text-xs italic">
                    No data available
                  </div>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
