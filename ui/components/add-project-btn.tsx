"use client"

import Link from "next/link"
import { PlusCircle } from "lucide-react"

const AddProjectBtn = () => {
    return (
        <Link
            href="/dashboard?tab=newProject"
            className="
        p-4 flex flex-col items-center justify-center gap-2
        border-[0.5px] rounded-md shadow-sm
        border-gray-300/20 hover:border-gray-300/55
        bg-background/5 hover:bg-background/10
        transition-all duration-200 ease-in-out
        min-h-[11rem] cursor-pointer min-w-xs w-full
        max-w-sm
      "
        >
            <div className="p-3 rounded-full bg-gray-700/40">
                <PlusCircle className="text-gray-200" size={26} />
            </div>
            <span className="text-sm font-medium text-gray-300">Add Project</span>
        </Link>
    )
}

export default AddProjectBtn
