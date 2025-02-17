import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { isAxiosError } from "@/api/client";
import { useLogin } from "@/api/auth";
import { toast } from "sonner";

export const Route = createFileRoute('/login')({
    component: LoginComponent,
});

function LoginComponent() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const login = useLogin();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        login.mutate(
            { username, password },
            {
                onSuccess: () => {
                    toast.success("Logged in successfully");
                    navigate({ to: "/" });
                },
                onError: (error) => {
                    if (isAxiosError(error)) {
                        toast.error(error.response?.data?.error || "An error occurred during login");
                    }
                },
            }
        );
    };

    return (
        <main className="flex-1 flex items-center justify-center p-4 bg-[--background]">
            <div className="w-full max-w-[400px]">
                <Card className="shadow-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
                        <CardDescription>Sign in to your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    disabled={login.isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={login.isPending}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={login.isPending}
                            >
                                {login.isPending ? "Signing in..." : "Sign in"}
                            </Button>
                            <div className="text-center text-sm">
                                <span className="text-muted-foreground">Don't have an account? </span>
                                <Button
                                    variant="link"
                                    className="p-0 h-auto font-normal"
                                    onClick={() => navigate({ to: "/signup" })}
                                >
                                    Sign up
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
} 