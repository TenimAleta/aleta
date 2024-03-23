function MiniBundle({ bundle, part }) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'white',
                borderRadius: '5px',
                color: 'black',
                fontSize: 10,
                padding: 4,
                gap: 3,
            }}
        >
            <span style={{ fontWeight: 'bold' }}>{part[0].toUpperCase()}</span>
            <span>{bundle.shortName || bundle.nom}</span>
        </div>
    );
}

export default MiniBundle;