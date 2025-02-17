import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Github, Star, Zap } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'

export const Route = createFileRoute('/')({
    component: HomeRoute,
})

function HomeRoute() {
    return (
        <div className="flex flex-col min-h-full">
            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center px-6 relative">
                <div className="absolute top-8 right-8">
                    <ModeToggle />
                </div>
                <div className="max-w-[800px] text-center space-y-8">
                    <h1 className="text-6xl font-bold tracking-tighter">
                        Welcome to Queso
                    </h1>
                    <p className="text-xl text-[--muted-foreground]">
                        A modern, fast, and delightful web application framework built with React and TypeScript.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            size="lg"
                            variant="default"
                            className="h-12 px-6 bg-[--primary] text-[--primary-foreground] hover:bg-[--primary]/90 [&>svg]:text-[--primary-foreground]"
                        >
                            Get Started
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-12 px-6 border-[--border] bg-background text-[--foreground] hover:bg-[--accent] hover:text-[--accent-foreground] [&>svg]:text-[--foreground]"
                        >
                            <Github className="mr-2 h-5 w-5" />
                            GitHub
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="w-full py-24 px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-[--foreground]" />
                                Lightning Fast
                            </CardTitle>
                            <CardDescription>
                                Built with performance in mind from the ground up
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            Optimized build process and runtime performance for the best user experience.
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-[--foreground]" />
                                Type Safe
                            </CardTitle>
                            <CardDescription>
                                Full TypeScript support out of the box
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            Catch errors early and improve development experience with complete type safety.
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Github className="h-5 w-5 text-[--foreground]" />
                                Open Source
                            </CardTitle>
                            <CardDescription>
                                Free and open source forever
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            Built and maintained by the community, for the community.
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    )
}
