import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Github, Star, Zap } from 'lucide-react'

export const Route = createFileRoute('/')({
    component: HomeRoute,
})

function HomeRoute() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-background">
                <h1 className="text-5xl font-bold tracking-tighter mb-6">
                    Welcome to Queso
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-[600px]">
                    A modern, fast, and delightful web application framework built with React and TypeScript.
                </p>
                <div className="flex gap-4">
                    <Button size="lg">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button size="lg" variant="outline">
                        <Github className="mr-2 h-4 w-4" />
                        GitHub
                    </Button>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-primary" />
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
                                <Star className="h-5 w-5 text-primary" />
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
                                <Github className="h-5 w-5 text-primary" />
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
