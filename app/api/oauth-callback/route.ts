import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const connectionId = searchParams.get('connectionId')
  const error = searchParams.get('error')
  const errorData = searchParams.get('errorData')
  const state = searchParams.get('state')
  const token = searchParams.get('token')

  // Return an HTML page that sends postMessage to parent window and closes itself
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Connecting...</title>
      </head>
      <body>
        <script>
          (function() {
            const connectionId = ${connectionId ? `"${connectionId}"` : 'null'};
            const error = ${error ? `"${error}"` : 'null'};
            const errorData = ${errorData ? `"${errorData}"` : 'null'};
            
            if (window.opener) {
              if (error) {
                window.opener.postMessage({
                  error: error,
                  errorData: errorData
                }, '*');
              } else if (connectionId) {
                window.opener.postMessage({
                  connectionId: connectionId,
                  connection: { id: connectionId }
                }, '*');
              } else {
                window.opener.postMessage({
                  error: 'Unknown error occurred'
                }, '*');
              }
              window.close();
            } else {
              // Fallback: redirect to home page if no opener
              window.location.href = '/';
            }
          })();
        </script>
        <p>Connecting...</p>
      </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
