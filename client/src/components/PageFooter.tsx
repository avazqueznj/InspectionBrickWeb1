export function PageFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-8">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium">Inspection Brick</p>
            <p>Equipment and Vehicle Inspections</p>
          </div>
          <div className="text-right">
            <p className="mb-1">
              <a 
                href="https://github.com/avazqueznj/TheBrickIssues/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline"
                data-testid="link-bug-reports"
              >
                Report Bugs
              </a>
            </p>
            <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
