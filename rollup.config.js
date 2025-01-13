import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-css-only';
import fs from 'fs';
import cleancss from 'clean-css';
import http from 'http';
import routes from './fake-backend/routes.js';
import apis from './fake-backend/apis.js';

const AESC = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    strikethrough: '\x1b[9m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
};


const production = !process.env.ROLLUP_WATCH;
const STATIC_DIR = 'public';
const SOURCE_DIR = 'src';


function serverReloadAll(){
    if(!global.liveReloadConnectionList) return;
    for(let id in global.liveReloadConnectionList){
        global.liveReloadConnectionList[id].write('reload\n');
    }
}

function generateRandomId() {
    const timestamp = Date.now().toString();
    const randomChars = Math.random().toString(36).substring(2, 7);
    return timestamp + randomChars;
}

function serve() {
	return {
		writeBundle:()=>{
            serverReloadAll(); 
			if (global.server) return;
			global.server = http.createServer((req, res) => {
                //处理热重载链接
                if(req.url=='/114514/livereload'){
                    res.writeHead(200, {
                        'Content-Type': 'text/txt',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    });
                    let id = generateRandomId();
                    if(!global.liveReloadConnectionList) global.liveReloadConnectionList = {};
                    global.liveReloadConnectionList[id] = res; 
                    req.on('close', () => {
                        delete global.liveReloadConnectionList[id];
                    });
                    return;
                }
                //处理日志
                const startTime = Date.now();
                const oldEnd = res.end;
                res.end = function(...args){
                    console.log(`${req.method}  ${res.statusCode}  ${Date.now()-startTime}ms  ${req.url}`);
                    oldEnd.apply(this, args);
                };
                //处理路由
                if(routes[req.url]){
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    return res.end(fs.readFileSync(STATIC_DIR+'/'+routes[req.url]));
                }
                //处理虚拟api
                if(apis[req.url]){
                    const result = apis[req.url];
                    if(typeof result === 'function'){
                        return result(req,res);
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify(apis[req.url]));
                }
                //处理资源文件
                if(req.url.split('/')[1]==='assets' && fs.existsSync(STATIC_DIR+req.url)){
                    res.writeHead(200,);
                    return res.end(fs.readFileSync(STATIC_DIR+req.url));
                }

                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end();
            });
            let port = 8080;
            global.server.listen(port, () => {
                console.log(`\n\n${AESC.bold}  Your application is ready~! 🚀`);
                console.log(`\n- Local:\thttp://localhost:${port}${AESC.reset}`);
                console.log(`\n\n──────────────────${AESC.bgYellow} LOGS ${AESC.reset}──────────────────`);
                
            });
            
		}
	};
}

function assembledHtml(pageName){
    return {
        closeBundle: function(options, bundle) {
            let templateHtmlPath = `${SOURCE_DIR}/template.html`;
            let globalCssPath = `${SOURCE_DIR}/global.css`;
            let cssPath = `${STATIC_DIR}/${pageName}.css`;
            let jsPath = `${STATIC_DIR}/${pageName}.js`;
            let targetHtmlPath = `${STATIC_DIR}/${pageName}.html`;

            let templateHtml = fs.readFileSync(templateHtmlPath, 'utf8');
            let globalCss = fs.readFileSync(globalCssPath, 'utf8');

            let css = fs.readFileSync(cssPath, 'utf8');
            fs.unlinkSync(cssPath);
            console.log(`${AESC.green}deleted ${AESC.bold}${cssPath}${AESC.reset}`);
            
            let js = fs.readFileSync(jsPath, 'utf8');
            fs.unlinkSync(jsPath);
            console.log(`${AESC.green}deleted ${AESC.bold}${jsPath}${AESC.reset}`);
            let livereloadScript = ``;
            if(!production){
                livereloadScript='console.log("热重载服务已启用");'+function liveReloadConnect(){
                    //热重载脚本
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', '114514/livereload', true);
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 3) {
                            const responseArray = xhr.responseText.split('\n');
                            const response = responseArray[responseArray.length-2];
                            switch (response) {
                                case 'reload':
                                    location.reload();
                                    break;
                                default:
                                    break;
                            }
                        }
                    };
                    xhr.onerror = function() {
                        console.log('热重载服务器连接失败,3秒后重试');
                        setTimeout(liveReloadConnect,3000)
                    };
                    xhr.send();
                }.toString()+';liveReloadConnect();'; 
            }

            let html = templateHtml
            .replace('<!-- title -->', ()=>{
                return `<title>${pageName}</title>`
            })
            .replace('<!-- style -->', ()=>{
                return `<style>${new cleancss().minify(globalCss).styles+css}</style>`
            })
            .replace('<!-- script -->', ()=>{
                return `<script id="svelteScript">${js}svelteScript.remove();${livereloadScript}</script>`
            });
            
            fs.writeFileSync(targetHtmlPath, html);
            console.log(`${AESC.green}created ${AESC.bold}${targetHtmlPath}${AESC.reset}`);
            
        }
    };
}

function copyAssets() {
    return {
        closeBundle: function(options, bundle) {
            //复制src/assets文件夹
            let srcDir = `${SOURCE_DIR}/assets`;
            let targetDir = `${STATIC_DIR}/assets`;
            if (fs.existsSync(srcDir)) {
                fs.cpSync(srcDir, targetDir, { recursive: true });
                console.log(`${AESC.green}copied ${AESC.bold}${srcDir} → ${targetDir}${AESC.reset}`);
                
            }
        }
    };
}

function generateConfigs() {
    let srcDirs = fs.readdirSync(SOURCE_DIR+'/pages').filter((file) => fs.lstatSync(`${SOURCE_DIR}/pages/${file}`).isDirectory());
    let result = [];
    for(let dir of srcDirs){
        const isLast = srcDirs.indexOf(dir) === srcDirs.length - 1;
        let pageName = dir;
        let config = {
            plugins: [
                svelte({
                    compilerOptions: {
                        dev: !production
                    }
                }),
                resolve({
                    browser: true,
                    dedupe: ['svelte'],
                    exportConditions: ['svelte']
                }),
                commonjs(),
                terser(),
                css({ output: pageName+'.css' }),
                assembledHtml(pageName),
                isLast && copyAssets(),
                isLast && !production && serve(),
            ],
            watch: {
                clearScreen: false
            },
            input:`${SOURCE_DIR}/pages/${pageName}/main.js`,
            output: {
                sourcemap: false,
                format: 'iife',
                name: dir,
                file: `${STATIC_DIR}/${pageName}.js`
            }
        }
        result.push(config);
    }
    return result;
}

export default generateConfigs()
