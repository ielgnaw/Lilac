define(
    [
        './cat',
        './dog',
        './tiger',
        './lion'
    ],
    function ( cat, dog, tiger, lion ) {
        return {
            name: 'amd/manyDependencies/index',
            check: function () {
                var valid =
                    cat.name == 'amd/manyDependencies/cat'
                    && dog.name == 'amd/manyDependencies/dog'
                    && tiger.name == 'amd/manyDependencies/tiger'
                    && lion.name == 'amd/manyDependencies/lion';
                return valid;
            }
        };
    }
);