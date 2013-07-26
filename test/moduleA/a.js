define('moduleA/a', ['moduleB/b', 'moduleC/c'], function(b){
    console.log('aaa', arguments);
    return {
        a: 'a'
    }
});

// define(function(a){
//     console.log('aaaaa');
//     return {
//         a: 'a'
//     }
// });