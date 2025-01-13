import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import css from 'rollup-plugin-css-only';
import fs from 'fs';
import cleancss from 'clean-css';
import http from 'http';
import routes from './fake-backend/routes.js';
import apis from './fake-backend/apis.js';

const production = !process.env.ROLLUP_WATCH;
const STATIC_DIR = 'public';
const SOURCE_DIR = 'src';


function serve() {
	return {
		writeBundle:()=>{
			if (global.server) return;
			global.server = http.createServer((req, res) => {
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
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    return res.end(fs.readFileSync(STATIC_DIR+req.url));
                }

                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end();
            });
            let port = 8080;
            global.server.listen(port, () => {
                console.log('\n\n  Your application is ready~! 🚀');
                console.log('\n- Local:\thttp://localhost:'+port);
                console.log('\n\n────────────────── LOGS ──────────────────');
                
            });
            
		}
	};
}

function assembledHtml(pageName){
    return {
        writeBundle: function(options, bundle) {
            let templateHtml = fs.readFileSync(SOURCE_DIR+'/template.html', 'utf8');
            let globalCss = fs.readFileSync(SOURCE_DIR+'/global.css', 'utf8');

            let css = fs.readFileSync(`${STATIC_DIR}/${pageName}.css`, 'utf8');
            fs.unlinkSync(`${STATIC_DIR}/${pageName}.css`);
            let js = fs.readFileSync(`${STATIC_DIR}/${pageName}.js`, 'utf8');
            fs.unlinkSync(`${STATIC_DIR}/${pageName}.js`);
            let html = templateHtml
            .replace('<!-- title -->', ()=>{
                return `<title>${pageName}</title>`
            })
            .replace('<!-- style -->', ()=>{
                return `<style>${new cleancss().minify(globalCss).styles+css}</style>`
            })
            .replace('<!-- script -->', ()=>{
                return `<script id="svelteScript">${js}svelteScript.remove()</script>`
            });
            
            fs.writeFileSync(`${STATIC_DIR}/${pageName}.html`, html);
        }
    };
}

function copyAssets() {
    return {
        writeBundle: function(options, bundle) {
            //复制src/assets文件夹
            if (fs.existsSync(SOURCE_DIR+'/assets')) {
                fs.cpSync(SOURCE_DIR+'/assets', STATIC_DIR+'/assets', { recursive: true });
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
                isLast && !production && livereload('public')
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
