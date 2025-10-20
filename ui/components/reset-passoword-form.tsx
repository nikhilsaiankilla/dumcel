"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";

const resetPasswordSchema = z.object({
    email: z.string().email({ message: "Enter a valid email" }),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password too long"),
});

type Inputs = z.infer<typeof resetPasswordSchema>;

interface ResetPassFormProps extends React.ComponentProps<"div"> {
    email: string // email is passed from parent component
}

export function ResetPasswordForm({
    className,
    email,
    ...props
}: ResetPassFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<Inputs>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            email: email,
            newPassword: "",
        },
    });

    const [resErrors, setResErrors] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const router = useRouter();

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        setResErrors("");
        setSuccess("");
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
            if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL is not defined");

            const res = await fetch(baseUrl + "/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });

            const json = await res.json();

            if (!json.success) {
                setResErrors(json.error || "Something went wrong");
                return;
            }

            setSuccess("Password reset successful! Redirecting to login...");
            setTimeout(() => router.push("/login"), 2000);
        } catch (error: unknown) {
            setResErrors(
                error instanceof Error ? error.message : "Something went wrong"
            );
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Reset your password</CardTitle>
                    <CardDescription>
                        Enter your email and new password below to reset your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    {...register("email")}
                                    required
                                    readOnly
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Enter your new password"
                                    {...register("newPassword")}
                                    required
                                />
                                {errors.newPassword && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.newPassword.message}
                                    </p>
                                )}
                            </Field>

                            <Field>
                                <Button type="submit" className="cursor-pointer w-full">
                                    Reset Password
                                </Button>
                                <FieldDescription className="text-center mt-2">
                                    Remembered your password?{" "}
                                    <a href="/login" className="underline">
                                        Log in
                                    </a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>

                        {resErrors && (
                            <p className="text-red-500 text-sm mt-2 text-center">
                                {resErrors}
                            </p>
                        )}
                        {success && (
                            <p className="text-green-600 text-sm mt-2 text-center">
                                {success}
                            </p>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
