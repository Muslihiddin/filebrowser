import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Placeholder while the migration is in progress.
// The Vue app in ../frontend is still the production frontend.
function App() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>File Browser</CardTitle>
          <CardDescription>React migration in progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">shadcn/ui works</Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default App
