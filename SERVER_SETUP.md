# Drive Sheopals Server Setup

## Purpose
This document explains how to set up this project on a new Windows server using XAMPP so that:

- `http://localhost/` serves XAMPP `htdocs`
- `https://drive.sheopalscrm.in/` proxies to the Next.js app running on port `3000`
- Apache, MySQL, and the Next.js app can be started together from one batch file

## Paths Used On Current Server
Update these values first when moving to a new server:

- XAMPP root: `C:\xampp`
- Apache config: `C:\xampp\apache\conf\httpd.conf`
- Apache HTTP vhosts: `C:\xampp\apache\conf\extra\httpd-vhosts.conf`
- Apache SSL vhost: `C:\xampp\apache\conf\extra\httpd-ssl.conf`
- XAMPP web root: `C:\xampp\htdocs`
- Project root: `C:\Users\PC\Desktop\drive_sheopals`
- Startup script: `C:\Users\PC\Desktop\drive_sheopals\start_drive_stack.bat`
- Apache binary: `C:\xampp\apache\bin\httpd.exe`
- MySQL binary: `C:\xampp\mysql\bin\mysqld.exe`
- MySQL config: `C:\xampp\mysql\bin\my.ini`

## Values You Must Change On A New Server
Search and replace these values everywhere they appear:

- Subdomain: `drive.sheopalscrm.in`
- Project path: `C:\Users\PC\Desktop\drive_sheopals`
- XAMPP path if not installed in `C:\xampp`
- App port if you do not want `3000`
- SSL certificate file path
- SSL private key file path
- Any `.env` values used by the Next.js app

## 1. Install Requirements
Install these first:

- XAMPP
- Node.js and npm
- Project code in the target project directory
- Project dependencies with `npm install`
- Production build with `npm run build`

## 2. Enable Apache Proxy Modules
Open `C:\xampp\apache\conf\httpd.conf` and make sure these lines are enabled:

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so
```

Also make sure these includes exist:

```apache
Include conf/extra/httpd-vhosts.conf
Include conf/extra/httpd-ssl.conf
```

## 3. Configure HTTP Virtual Hosts
Open `C:\xampp\apache\conf\extra\httpd-vhosts.conf` and use this:

```apache
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot "C:/xampp/htdocs"

    <Directory "C:/xampp/htdocs">
        Options Indexes FollowSymLinks Includes ExecCGI
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog "logs/localhost-error.log"
    CustomLog "logs/localhost-access.log" common
</VirtualHost>

<VirtualHost *:80>
    ServerName drive.sheopalscrm.in
    Redirect permanent / https://drive.sheopalscrm.in/

    ErrorLog "logs/drive-error.log"
    CustomLog "logs/drive-access.log" common
</VirtualHost>
```

What to change on a new server:

- Change `drive.sheopalscrm.in` to the new subdomain
- Change `C:/xampp/htdocs` if XAMPP is installed elsewhere

## 4. Configure HTTPS Reverse Proxy
Open `C:\xampp\apache\conf\extra\httpd-ssl.conf` and use the SSL virtual host for the app:

```apache
<VirtualHost *:443>
    ServerName drive.sheopalscrm.in:443
    ServerAlias drive.sheopalscrm.in
    ServerAdmin admin@example.com
    ErrorLog "C:/xampp/apache/logs/drive-ssl-error.log"
    TransferLog "C:/xampp/apache/logs/drive-ssl-access.log"

    SSLEngine on

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    SSLCertificateFile "conf/ssl.crt/server.crt"
    SSLCertificateKeyFile "conf/ssl.key/server.key"
</VirtualHost>
```

What to change on a new server:

- `drive.sheopalscrm.in`
- Backend port `3000` if the app runs on a different port
- `SSLCertificateFile`
- `SSLCertificateKeyFile`
- Log paths if Apache is installed elsewhere

## 5. Build And Start The Project
From the project directory:

```bat
cd /d C:\Users\PC\Desktop\drive_sheopals
npm install
npm run build
npm run start
```

If you use a different folder on a new server, update that path in:

- `start_drive_stack.bat`
- this document
- any deployment shortcuts or Task Scheduler entries

## 6. Startup Batch File
This project includes:

- `C:\Users\PC\Desktop\drive_sheopals\start_drive_stack.bat`

It starts:

- Apache from XAMPP
- MySQL from XAMPP
- Next.js from the project folder using `npm.cmd run start`

Before using it on a new server, edit these variables inside the file:

```bat
set "XAMPP_ROOT=C:\xampp"
set "PROJECT_DIR=C:\Users\PC\Desktop\drive_sheopals"
set "APP_PORT=3000"
```

## 7. Start Automatically When Windows Starts
Option 1: Startup folder

1. Press `Win + R`
2. Run `shell:startup`
3. Put a shortcut to `C:\Users\PC\Desktop\drive_sheopals\start_drive_stack.bat` there

Option 2: Task Scheduler

Use Task Scheduler if you want it to run hidden or with admin privileges.

Recommended settings:

- Trigger: `At log on`
- Action: start `C:\Users\PC\Desktop\drive_sheopals\start_drive_stack.bat`
- Run with highest privileges: enabled if needed
- Start in: `C:\Users\PC\Desktop\drive_sheopals`

## 8. DNS / Proxy Notes
For a new server, make sure:

- DNS for the subdomain points to the server IP
- Port `80` and `443` are open
- If using Cloudflare, proxy settings match your SSL mode
- If using `Full (strict)` on Cloudflare, install a valid origin certificate in Apache

## 9. Verification Commands
Check Apache config:

```bat
C:\xampp\apache\bin\httpd.exe -t
C:\xampp\apache\bin\httpd.exe -S
```

Check local routing:

```bat
curl -I http://localhost/
curl -I --resolve drive.sheopalscrm.in:80:127.0.0.1 http://drive.sheopalscrm.in/
curl -I -k --resolve drive.sheopalscrm.in:443:127.0.0.1 https://drive.sheopalscrm.in/
```

Expected result:

- `localhost` serves from `htdocs`
- `http://drive.sheopalscrm.in/` redirects to HTTPS
- `https://drive.sheopalscrm.in/` returns Next.js headers and content from port `3000`

## 10. Common Problems
If `localhost` opens the Next.js app:

- check `httpd-vhosts.conf` order
- make sure `localhost` is the first `*:80` vhost
- run `httpd.exe -S`

If the subdomain shows XAMPP on HTTPS:

- check `httpd-ssl.conf`
- make sure the `*:443` vhost has `ServerName drive.sheopalscrm.in:443`
- restart Apache after changes

If the proxy fails:

- make sure the app is running on `127.0.0.1:3000`
- check `C:\xampp\apache\logs\drive-error.log`
- check `C:\xampp\apache\logs\drive-ssl-error.log`

If `npm run start` fails:

- run `npm install`
- run `npm run build`
- verify `.env` values
