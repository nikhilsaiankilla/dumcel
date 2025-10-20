"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader, BrickWall } from "lucide-react";

interface DeployProjectFormProps {
    projectId: string;
}

interface EnvVar {
    key: string;
    value: string;
}

const DeployProjectForm: React.FC<DeployProjectFormProps> = ({ projectId }) => {
    const [envVars, setEnvVars] = useState<EnvVar[]>([{ key: "", value: "" }]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleChange = (index: number, field: keyof EnvVar, value: string) => {
        const updated = [...envVars];
        updated[index][field] = value;
        setEnvVars(updated);
    };

    const addEnvVar = () => setEnvVars([...envVars, { key: "", value: "" }]);

    const removeEnvVar = (index: number) => {
        const updated = [...envVars];
        updated.splice(index, 1);
        setEnvVars(updated);
    };

    const deployProject = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("You must be logged in to deploy");
                setLoading(false);
                return;
            }

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/project/deploy/${projectId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token,
                    },
                    body: JSON.stringify({
                        env: envVars
                            .filter((e) => e.key.trim() && e.value.trim())
                            .reduce((acc, cur) => {
                                acc[cur.key] = cur.value;
                                return acc;
                            }, {} as Record<string, string>),
                    }),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                toast.error(`Deployment failed: ${errorText}`);
                return;
            }

            const json = await res.json();

            if (json.status) {
                toast.success("Deployment started successfully");
                router.refresh();
            } else {
                toast.error("Deployment failed. Try again later.");
            }
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold">Deploy Project</h3>

            <div className="space-y-3">
                <Label className="font-medium">Environment Variables</Label>

                {envVars.map((env, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input
                            placeholder="KEY"
                            value={env.key}
                            onChange={(e) => handleChange(index, "key", e.target.value)}
                            className="w-1/2 py-1.5"
                        />
                        <Input
                            placeholder="VALUE"
                            value={env.value}
                            onChange={(e) => handleChange(index, "value", e.target.value)}
                            className="w-1/2 py-1.5"
                        />
                        {envVars.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEnvVar(index)}
                                className="hover:text-red-500 duration-150 ease-in-out cursor-pointer"
                            >
                                <Trash2 size={16} />
                            </Button>
                        )}
                    </div>
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={addEnvVar}
                    className="flex items-center gap-2"
                >
                    <Plus size={14} /> Add Variable
                </Button>
            </div>

            <div className="pt-2">
                <Button
                    onClick={deployProject}
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader size={14} className="animate-spin" /> Deploying...
                        </>
                    ) : (
                        <>
                            <BrickWall size={14} /> Deploy
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default DeployProjectForm;
