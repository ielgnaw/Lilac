
define(
    'modules/combine/dog',
    function () {
        return {
            name: 'modules/combine/dog'
        };
    }
);

define(
    'modules/combine/lion',
    function () {
        return {
            name: 'modules/combine/lion'
        };
    }
);

define(
    'modules/combine/tiger',
    function () {
        return {
            name: 'modules/combine/tiger'
        };
    }
);

define(
    'modules/combine/index2',
    [
        'modules/combine/dog',
        'modules/combine/tiger'
    ],
    function ( dog, tiger ) {
        var lion = require( 'modules/combine/lion' );

        return {
            name: 'modules/combine/index2',
            check: function () {
                var valid =
                    dog.name == 'modules/combine/dog'
                    && tiger.name == 'modules/combine/tiger'
                    && lion.name == 'modules/combine/lion';
                return valid;
            }
        };
    }
);



