define(
    'circleDependency/cat',
    [ 'circleDependency/dog', 'circleDependency/index' ],
    function ( dog ) {
        return {
            name: 'circleDependency/cat',
            check: function () {
                return dog.name == 'circleDependency/dog';
            }
        };
    }
);