import { createFileRoute, redirect } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Github, Star, Zap, User, LogOut } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: HomeRoute,
});

function HomeRoute() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/login' });
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6">
        <div className="absolute top-8 right-8">
          <ModeToggle />
        </div>
        {/* User Badge */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="fixed bottom-4 left-4 flex items-center gap-2 rounded-full bg-[--primary] px-3 py-1 text-sm text-[--primary-foreground] shadow-md transition-colors hover:bg-[--primary]/90">
                <User className="h-4 w-4" />
                <span>{user.username}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="max-w-[800px] space-y-8 text-center">
          <h1 className="text-6xl font-bold tracking-tighter">Welcome to Queso</h1>
          <p className="text-xl text-[--muted-foreground]">
            A modern, fast, and delightful web application framework built with React and
            TypeScript.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              variant="default"
              className="h-12 bg-[--primary] px-6 text-[--primary-foreground] hover:bg-[--primary]/90 [&>svg]:text-[--primary-foreground]"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-background h-12 border-[--border] px-6 text-[--foreground] hover:bg-[--accent] hover:text-[--accent-foreground] [&>svg]:text-[--foreground]"
            >
              <Github className="mr-2 h-5 w-5" />
              GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full px-6 py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[--foreground]" />
                Lightning Fast
              </CardTitle>
              <CardDescription>Built with performance in mind from the ground up</CardDescription>
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
              <CardDescription>Full TypeScript support out of the box</CardDescription>
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
              <CardDescription>Free and open source forever</CardDescription>
            </CardHeader>
            <CardContent>Built and maintained by the community, for the community.</CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
