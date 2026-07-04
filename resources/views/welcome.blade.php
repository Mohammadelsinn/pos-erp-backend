<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POS + ERP + Accounting System</title>
    <!-- Premium Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
    
    <script>
        // Immediately set the theme class to prevent flickers
        if (localStorage.getItem('app-theme') === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    </script>
    
    <script>
        window.addEventListener('error', function(event) {
            const root = document.getElementById('root');
            if (root) {
                root.innerHTML = `
                    <div style="padding: 20px; background: #1e1b4b; color: #f43f5e; font-family: monospace; border: 2px solid #f43f5e; margin: 20px; border-radius: 8px;">
                        <h2 style="margin-top: 0; color: #ef4444;">Frontend Runtime Error:</h2>
                        <p><strong>Message:</strong> ${event.message}</p>
                        <p><strong>File:</strong> ${event.filename}</p>
                        <p><strong>Line:</strong> ${event.lineno}, <strong>Col:</strong> ${event.colno}</p>
                        <pre style="background: #0f172a; padding: 15px; overflow-x: auto; color: #cbd5e1; border-radius: 4px; border: 1px solid #334155; font-size: 13px; line-height: 1.5;">${event.error ? event.error.stack : 'No stack trace available'}</pre>
                    </div>
                `;
            }
        });
        window.addEventListener('unhandledrejection', function(event) {
            const root = document.getElementById('root');
            if (root) {
                root.innerHTML = `
                    <div style="padding: 20px; background: #1e1b4b; color: #f43f5e; font-family: monospace; border: 2px solid #f43f5e; margin: 20px; border-radius: 8px;">
                        <h2 style="margin-top: 0; color: #ef4444;">Unhandled Promise Rejection:</h2>
                        <p><strong>Reason:</strong> ${event.reason}</p>
                    </div>
                `;
            }
        });
    </script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="h-full bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
    <div id="root" class="h-full"></div>
</body>
</html>
