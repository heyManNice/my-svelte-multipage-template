/**
 * 开发调试阶段的虚拟api接口
 * 键是浏览器请求的url路径
 * 值是对应的json数据
 * 值也可以是函数
 * @param {Request} req
 * @param {Response} res
 */

export default {
    '/api/test': {code:200,msg:'test'},
    '/api/testfun':function(req,res){
        if(req.method!=='POST'){
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({code:404,msg:'method not allowed'}));
        }
        let body='';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        body=JSON.parse(body);
        req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({code:200,msg:'testfun',body}));
        });
    }
}