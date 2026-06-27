@echo off
cd /d C:\ReplitProjects\Lead-Sweep\Lead-Sweep
set NODE_ENV=development
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
)
node node_modules\tsx\dist\cli.mjs server/dev-server.ts
