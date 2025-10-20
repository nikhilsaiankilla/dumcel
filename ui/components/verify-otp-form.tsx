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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useRouter } from "next/navigation"

// OTP schema (6-digit numeric code)
const otpSchema = z.object({
    otp: z.string().min(6, "Enter the full 6-digit OTP"),
})

type Inputs = z.infer<typeof otpSchema>

interface VerifyOtpFormProps extends React.ComponentProps<"div"> {
    email: string // email is passed from parent component
}

export function VerifyOtpForm({ className, email, ...props }: VerifyOtpFormProps) {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<Inputs>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: "" },
    })

    const [resErrors, setResErrors] = useState<string>("")
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const router = useRouter()

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        try {
            setIsSubmitting(true)
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL is not defined")

            const res = await fetch(baseUrl + "/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, otp: data.otp }),
            })

            const json = await res.json()

            if (!json.success) {
                setResErrors(json.error || "Invalid OTP. Please try again.")
                return
            }

            router.push("/reset-password") // Redirect after successful OTP verification
        } catch (error: unknown) {
            setResErrors(error instanceof Error ? error.message : "Something went wrong")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Verify your OTP</CardTitle>
                    <CardDescription>
                        Enter the 6-digit OTP sent to <span className="font-medium">{email}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="w-full">
                    <form onSubmit={handleSubmit(onSubmit)} className="w-full flex items-center justify-center">
                        <FieldGroup>
                            <Field>
                                <FieldLabel>OTP</FieldLabel>
                                <InputOTP
                                    maxLength={6}
                                    onChange={(value) => setValue("otp", value)}
                                >
                                    <InputOTPGroup>
                                        {[0, 1, 2, 3, 4, 5].map((i) => (
                                            <InputOTPSlot key={i} index={i} />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>

                                {errors.otp && (
                                    <p className="text-red-500 text-sm mt-1">{errors.otp.message}</p>
                                )}
                            </Field>

                            <Field>
                                <Button
                                    type="submit"
                                    className="cursor-pointer w-full"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Verifying..." : "Verify OTP"}
                                </Button>
                                <FieldDescription className="text-center mt-2">
                                    Didn’t get the OTP?{" "}
                                    <button
                                        type="button"
                                        className="underline"
                                        onClick={() => router.push("/forgot-password")}
                                    >
                                        Resend
                                    </button>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>

                        {resErrors && (
                            <p className="text-red-500 text-sm mt-2 text-center">{resErrors}</p>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
