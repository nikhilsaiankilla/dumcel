"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProjectsTab from "@/components/projects-tab"
import DeploymentTab from "@/components/DeploymentTab"
import { CreateProjectForm } from "@/components/create-project-form"

const Page = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Controlled state for active tab
  const [activeTab, setActiveTab] = useState("Overview")

  // Sync tab when URL changes (reacts to manual URL edits or navigation)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "Overview"
    setActiveTab(tabFromUrl)
  }, [searchParams])

  // Redirect if no ?tab= present
  useEffect(() => {
    if (!searchParams.get("tab")) {
      router.replace("?tab=Overview", { scroll: false })
    }
  }, [searchParams, router])

  // Update both state + URL when tab is changed by user
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.replace(`?tab=${value}`, { scroll: false })
  }

  return (
    <div className="w-full p-5 bg-background">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Scrollable Tabs Header */}
        <div
          className="
            w-full overflow-x-auto no-scrollbar
            border-b border-muted/20
            scroll-smooth snap-x snap-mandatory pb-2
          "
        >
          <TabsList
            className="
              flex min-w-max whitespace-nowrap
              bg-transparent px-1
            "
          >
            <TabsTrigger value="Overview" className="snap-start">
              Overview
            </TabsTrigger>
            <TabsTrigger value="newProject" className="snap-start">
              New Project
            </TabsTrigger>
            <TabsTrigger value="Deployments" className="snap-start">
              Deployments
            </TabsTrigger>
            <TabsTrigger value="Settings" className="snap-start">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Panels */}
        <div className="pt-5">
          <TabsContent value="Overview">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="Deployments">
            <DeploymentTab />
          </TabsContent>

          <TabsContent value="newProject">
            <CreateProjectForm />
          </TabsContent>

          <TabsContent value="Settings">
            <div className="text-sm text-muted-foreground">
              Change your password here.
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default Page
