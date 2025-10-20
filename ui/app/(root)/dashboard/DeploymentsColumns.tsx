"use client"
import { DeploymentType } from '@/types'
import { ColumnDef } from '@tanstack/react-table'
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const DeploymentColumns: ColumnDef<DeploymentType>[] = [
    {
        accessorKey: "_id",
        header: "Deployment ID",
        cell: ({ row }) => {
            const id: string = row.getValue("_id");
            return <div className='flex flex-col gap-1 px-3'>
                <span className='text-sm font-bold text-white'>{id.slice(-6)}</span>
                <p className='text-xs text-gray-400/60'>Production</p>
            </div> // last 6 digits
        },
    },
    {
        accessorKey: "state",
        header: "Status",
        cell: ({ row }) => {
            const state: string = row.getValue("state");
            let bgClass = 'bg-gray-600'

            switch (state) {
                case "not started":
                    bgClass = 'bg-gray-800'
                    break;
                case "queued":
                    bgClass = "bg-blue-500"
                    break;
                case "in progress":
                    bgClass = "bg-yellow-500"
                    break;
                case "ready":
                    bgClass = "bg-green-500"
                    break;
                case "failed":
                    bgClass = "bg-red-500"
                    break;
            }

            return (
                <div className='flex items-center gap-2'>
                    <span className={`p-1.5 border-[0.3] border-gray-400 rounded-full ${bgClass} shadow-xs`} />
                    <p className={`capitalize text-gray-400 font-semibold text-sm`}>{state}</p>
                </div>
            )
        },
    },
    {
        accessorKey: "projectName",
        header: "Project Name",
        cell: ({ row }) => {
            const projectName: string = row.getValue("projectName");
            return <span className="font-medium capitalize">{projectName}</span>;
        },
    },
    {
        accessorKey: "subDomain",
        header: "Domain",
        cell: ({ row }) => {
            const subDomain: string = row.getValue('subDomain');
            return <Link href={`https://${subDomain}.localhost:8001`} target="_blank" className='flex items-center gap-2 text-gray-300/60 hover:text-white transition-all duration-150 ease-in-out'>
                View Project<ExternalLink size={14} />
            </Link>
        }
    },
    {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ row }) => {
            const updatedAt: Date = row.getValue("updatedAt");
            return (
                <span>
                    {updatedAt
                        ? new Date(updatedAt).toLocaleString("en-US", {
                            dateStyle: "short",
                            timeStyle: "short",
                        })
                        : "-"}
                </span>
            );
        },
    },
];
