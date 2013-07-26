define('moduleB/b', ['moduleC/c', '../../moduleD/d'],function(c){
    console.log('bbbbb', arguments);
    return {
        b: 'b'
    }
});

// define(function(b){
//     console.log('bbbbb');
//     return {
//         b: 'b'
//     }
// });