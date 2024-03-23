const rebuildPosicions = (props) => {
    const { posicions, setPosicions, posicionsLog } = props;

    let _posicions = {};
    _posicions.castellers = {};
    _posicions.caixes = {};
    _posicions.fustes = [];

    // Brute force approach (no optimization)
    posicionsLog.forEach(pos => {
        if (pos.split(',').length < 2) return;

        // Fustes
        if (pos.split(',')[0] === 'FUSTES') {
            // FUSTES,ARRAY,LENGTH,FUSTA1,FUSTA2,...,REST
            const fustesLength = parseInt(pos.split(',')[2])

            _posicions.fustes = pos
                .split(',')
                .slice(3, 3 + fustesLength)
                .map(fusta => parseInt(fusta))

            return;
        }

        const targetToApply = pos.split(',')[0];
        const actionToBeDone = pos.split(',')[1];

        const caixaPos = targetToApply;
        const castellerPos = parseInt(actionToBeDone);

        // Case for erasing a position
        if (actionToBeDone === '_EMPTY_' && caixaPos in _posicions.caixes) {
            delete _posicions.castellers[_posicions.caixes[caixaPos]];  // make casteller available again
            delete _posicions.caixes[caixaPos];                         // make caixa available again
        } else if (actionToBeDone !== '_EMPTY_') {
            // If casteller is already in a caixa, empty previous caixa
            if (castellerPos in _posicions.castellers) delete _posicions.caixes[_posicions.castellers[castellerPos]];

            // If caixa has already a casteller, make that casteller available
            if (caixaPos in _posicions.caixes) delete _posicions.castellers[_posicions.caixes[caixaPos]];

            _posicions.castellers[castellerPos] = caixaPos;
            if (Number.isInteger(castellerPos)) _posicions.caixes[caixaPos] = castellerPos;
        }
    });

    return _posicions;
};

const applyChange = (props, pos) => {
    props.setPosicionsLog(prevLog => [...prevLog, pos]);
};

export { rebuildPosicions, applyChange };