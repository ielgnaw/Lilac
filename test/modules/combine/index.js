define(
    'modules/combine/index',
    [
        'modules/combine/test1',
        'modules/combine/test2'
    ],
    function (test1, test2) {
        // var test1 = require( 'modules/combine/test1' );
        // var test2 = require( 'modules/combine/test2' );
        return {
            name: 'modules/combine/index',
            check: function () {
                var valid =
                    test1.name == 'modules/combine/test1';
                return valid;
            }
        };
    }
);
define( 'modules/combine/test1', function  (require) {
    return {
        name: 'modules/combine/test1'
    };
} );

define( 'modules/combine/test2', function  (require) {
    return {
        name: 'modules/combine/test2'
    };
} );
