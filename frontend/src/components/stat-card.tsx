"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
  title: string
  value: ReactNode
  description?: string
  icon?: ReactNode
  className?: string
}

export function StatCard({ title, value, description, icon, className }: StatCardProps) {
  return (
    <Card className={cn("border-border/60 rounded-2xl shadow-sm", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
          <div className="text-muted-foreground/60">{icon}</div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-4xl font-semibold tracking-tight">{value}</div>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}


