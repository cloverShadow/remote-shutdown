var exec = require('child_process').exec;
var iconv = require('iconv-lite');

// exec("dir", {encoding: "gbk"}, function (err, stdout, stderr) {
//     if (!err) {
//         console.log(iconv.decode(stdout, "GBK"));
//     } else {
//         console.log(iconv.decode(stderr, "GBK"));
//     }
// });

//关机命令
console.log('正在关机');
exec('shutdown -s -f -t 15');