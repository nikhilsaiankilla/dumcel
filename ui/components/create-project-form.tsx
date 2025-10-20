"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Schema
const projectSchema = z.object({
    name: z
        .string()
        .min(3, "Project name must be at least 3 characters")
        .max(50, "Project name too long"),
    subdomain: z
        .string()
        .optional()
        .refine((val) => !val || /^[a-z0-9-]+$/.test(val), {
            message: "Subdomain must contain only lowercase letters, numbers, and hyphens",
        }),
    gitUrl: z
        .string()
        .url("Must be a valid URL")
        .refine((url) => url.includes("github.com"), {
            message: "Git URL must be a GitHub repository",
        }),
});

type ProjectInputs = z.infer<typeof projectSchema>;

export function CreateProjectForm({ className, ...props }: React.ComponentProps<"div">) {
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProjectInputs>({
        resolver: zodResolver(projectSchema),
        defaultValues: { name: "", subdomain: "", gitUrl: "", },
    });

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [resError, setResError] = useState("");
    const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
    const [subdomainLoading, setSubdomainLoading] = useState(false);
    const [repos, setRepos] = useState<{ id: string; name: string; url: string, branch: string, private: boolean, owner: string }[]>([]);
    const [reposLoading, setReposLoading] = useState(false);

    useEffect(() => {
        const fetchRepos = async () => {
            setReposLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/github/repos`, {
                    headers: { Authorization: "Bearer " + token },
                });
                const json = await res.json();
                console.log(json);

                if (json.length > 0) {

                    const repos = json.map((repo: any) => {
                        return {
                            id: repo.id,
                            name: repo.name,
                            url: repo.clone_url,
                            branch: repo.default_branch,
                            private: repo.private,
                            owner: repo.owner.login
                        }
                    })
                    setRepos(repos);
                }

            } catch (err) {
                console.error(err);
            } finally {
                setReposLoading(false);
            }
        };

        fetchRepos();
    }, []);

    const gitUrl = watch("gitUrl");
    const subdomain = watch("subdomain");

    const getSelectedRepoName = (url: string) => {
        const selectedRepo = repos.find(repo => repo.url === url);
        return selectedRepo ? selectedRepo.name : "Select a repo";
    };

    // Check subdomain availability on blur
    // Assuming 'subdomain' is watched and available here.

    const checkSubdomain = async () => {
        if (!subdomain) {
            setSubdomainAvailable(null); // Clear previous status if subdomain is cleared
            return;
        }

        // 1. Set loading state and clear previous error/status
        setSubdomainLoading(true);
        setSubdomainAvailable(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/project/check-subdomain?subdomain=${subdomain}`);

            // 2. Check for HTTP errors (e.g., 404, 500)
            if (!res.ok) {
                // Read error details if possible, or throw a generic error
                const errorData = await res.json().catch(() => ({ message: 'Server error' }));
                throw new Error(errorData.message || `HTTP error! Status: ${res.status}`);
            }

            // 3. Process the successful response
            const data = await res.json();

            // Ensure the response structure is correct
            if (typeof data.available !== 'boolean') {
                throw new Error("Invalid response from server.");
            }

            setSubdomainAvailable(data.available);

        } catch (error) {
            // 4. Handle any network or processing error
            console.error("Subdomain check failed:", error);
            setSubdomainAvailable(null); // Set to null on error to indicate an unknown state
        } finally {
            // 5. Clear loading state
            setSubdomainLoading(false);
        }
    };

    // Handle form submission
    const onSubmit: SubmitHandler<ProjectInputs> = async (data) => {
        try {
            setLoading(true);
            setResError("");

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
            if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL not set");

            const token = localStorage.getItem('token');

            if (!token) throw new Error('Token not found please login again')

            const res = await fetch(`${baseUrl}/project/add-project`, {
                method: "POST",
                headers: {
                    'Authorization': "Bearer " + token,
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(data),
            });

            const json = await res.json();

            if (json.status !== "success") {
                throw new Error(json.error || "Failed to create project");
            }

            router.push(`/dashboard/project/${json.data.project?._id}`);
        } catch (error: unknown) {
            setResError(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6 max-w-3xl w-full mx-auto mt-10", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Create a New Project</CardTitle>
                    <CardDescription>
                        Start by giving your project a name. You can assign a subdomain now or later.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            {/* Project Name */}
                            <Field>
                                <FieldLabel htmlFor="projectName">Project Name</FieldLabel>
                                <Input
                                    id="projectName"
                                    placeholder="e.g. my-awesome-app"
                                    {...register("name")}
                                    required
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                                )}
                            </Field>

                            <Field className="w-full">
                                <FieldLabel htmlFor="gitUrl">Git Repository</FieldLabel>
                                {reposLoading ? (
                                    <p>Loading your GitHub repos...</p>
                                ) : (
                                    <Select
                                        onValueChange={(value) => setValue("gitUrl", value)}
                                        value={gitUrl}
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder="Select a repo"
                                                className="truncate max-w-full py-2"
                                            >
                                                {gitUrl ? getSelectedRepoName(gitUrl) : "Select a repo"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="w-full">
                                            {repos.map((repo) => (
                                                <SelectItem
                                                    key={repo.id}
                                                    value={repo.url}
                                                    className="w-full px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700/20 focus:bg-gray-700/30 overflow-hidden text-ellipsis"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-cemter gap-2 font-medium text-white">
                                                            {repo.name}
                                                            {repo.private && <LockKeyhole size={14} />}
                                                        </div>
                                                        <div className="text-sm text-gray-400">
                                                            {repo.owner}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                                            <GitBranch size={14} /> {repo.branch}
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>

                                    </Select>
                                )}
                                {errors.gitUrl && (
                                    <p className="text-red-500 text-sm mt-1">{errors.gitUrl.message}</p>
                                )}
                            </Field>

                            {/* Subdomain */}
                            <Field>
                                <FieldLabel htmlFor="subdomain">Subdomain (optional)</FieldLabel>
                                <Input
                                    id="subdomain"
                                    placeholder="myapp"
                                    {...register("subdomain")}
                                    onBlur={checkSubdomain}
                                    // --- ADDED: Disable input while the check is running ---
                                    disabled={subdomainLoading}
                                />

                                {/* --- ADDED: Display Loading State --- */}
                                {subdomainLoading && (
                                    <p className="text-sm mt-1 text-gray-500 flex items-center gap-2">
                                        Checking availability <Loader2 className="h-4 w-4 animate-spin" />
                                    </p>
                                )}

                                {/* Display Availability Status (only if not loading and subdomain is present) */}
                                {/* --- MODIFIED: Added !subdomainLoading condition --- */}
                                {!subdomainLoading && subdomain && subdomainAvailable !== null && (
                                    <p
                                        className={cn(
                                            "text-sm mt-1",
                                            subdomainAvailable ? "text-green-500" : "text-red-500"
                                        )}
                                    >
                                        {subdomainAvailable
                                            ? "Subdomain is available"
                                            : "Subdomain is already taken"}
                                    </p>
                                )}

                                {errors.subdomain && (
                                    <p className="text-red-500 text-sm mt-1">{errors.subdomain.message}</p>
                                )}

                                <FieldDescription>
                                    Your project will be accessible at <b>{subdomain || "[subdomain]"}</b>
                                    .yourapp.com
                                </FieldDescription>
                            </Field>

                            {/* Submit */}
                            <Field>
                                <Button type="submit" className="cursor-pointer" disabled={loading}>
                                    {loading ? (
                                        <>
                                            Creating <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                        </>
                                    ) : (
                                        "Create Project"
                                    )}
                                </Button>
                            </Field>
                        </FieldGroup>

                        {resError && <p className="text-red-500 text-sm mt-2 text-center">{resError}</p>}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
