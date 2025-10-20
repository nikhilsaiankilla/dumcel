"use client"

import { useForm, SubmitHandler } from "react-hook-form"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader } from "lucide-react"

const loginSchema = z.object({
    email: z.string().email(),
})

type Inputs = z.infer<typeof loginSchema>

export function ForgetPassForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<Inputs>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
        },
    })

    const [resErrors, setResErrors] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();

    const onSubmit: SubmitHandler<Inputs> = async (data) => {

        try {
            setLoading(true)
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            if (!baseUrl) {
                throw new Error("NEXT_PUBLIC_BASE_URL is not defined")
            }
            const res = await fetch(baseUrl + '/auth/forget-password', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: 'include',
                body: JSON.stringify(data),
            })

            const json = await res.json();

            if (!json.success && json.error) {
                setLoading(false)
                setResErrors(json.error || "Something went wrong")
            }

            setLoading(false)
            return router.push('/verify-otp');
        } catch (error: unknown) {
            setLoading(false)
            setResErrors(error instanceof Error ? error.message : "Something went wrong")
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Forgot your password?</CardTitle>
                    <CardDescription>
                        Enter your registered email address and we’ll send you a OTP.
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
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                                )}
                            </Field>

                            <Field>
                                <Button type="submit" className="cursor-pointer w-full">
                                    {loading ? <>Sending OTP <Loader className="animate-spin"/></> : "Send Reset OTP"}
                                </Button>
                                <FieldDescription className="text-center mt-2">
                                    Remembered your password? <a href="/login" className="underline">Log in</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>

                        {resErrors && (
                            <p className="text-red-500 text-sm mt-1 text-center">{resErrors}</p>
                        )}
                    </form>
                </CardContent>
            </Card>

        </div>
    )
}
