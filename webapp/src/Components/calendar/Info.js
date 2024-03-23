import styles from './Events.styles';

function Info(props) {
    const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);
    
    const parseDate = (beginString, endString) => {
        const diaOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
        const horaOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };
        const dateBegin = new Date(beginString);
        const dateEnd = new Date(endString);

        const diaBegin = dateBegin.toLocaleDateString("ca-ES", diaOptions);
        const diaEnd = dateEnd.toLocaleDateString("ca-ES", diaOptions);

        const horaBegin = dateBegin.toLocaleTimeString("ca-ES", horaOptions);
        const horaEnd = dateEnd.toLocaleTimeString("ca-ES", horaOptions);

        const fullDay = horaBegin === '00:00' && horaEnd === '00:00';

        if (diaBegin === diaEnd) {
            return {
                dies: capitalizeFirstLetter(diaBegin),
                hores: `${horaBegin}-${horaEnd}`
            }
        } else if (fullDay && dateBegin.getDate() === dateEnd.getDate()-1) {
            return {
                dies: capitalizeFirstLetter(diaBegin),
                hores: `Tot el dia`
            }
        } else if (fullDay && dateBegin.getDate() < dateEnd.getDate()-1) {
            const d = new Date();
            d.setDate(dateEnd.getDate()-1);
            const diaEndMod = d.toLocaleDateString("ca-ES", diaOptions);

            return {
                dies: `${capitalizeFirstLetter(diaBegin)} > ${capitalizeFirstLetter(diaEndMod)}`,
                hores: `Tots el dies`
            }
        } else {
            return {
                dies: `${capitalizeFirstLetter(diaBegin)} > ${capitalizeFirstLetter(diaEnd)}`,
                hores: `${horaBegin}-${horaEnd}`
            }
        }
    };

    const [data_inici, data_fi] = [props["data-inici"], props["data-fi"]];

    return (
        <div style={styles.event}>
            <div style={styles.eventTitle}><a href={props.link} target="_blank">🔗</a> {props.title}</div>
            <div style={styles.eventDescription}><div style={{ margin: 10, fontSize: 14, fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: props.description }} /></div>
            <div style={styles.eventInfo}><div style={styles.emoji}><span>&#128197;</span></div><div style={styles.info_content}><span>{parseDate(data_inici, data_fi).dies}</span></div></div>
            <div style={styles.eventInfo} className="hores"><div style={styles.emoji}><span>&#9200;</span></div><div style={styles.info_content}><span>{parseDate(data_inici, data_fi).hores}</span></div></div>
            <div style={styles.eventInfo} className="lloc"><div style={styles.emoji}><span>&#128205;</span></div><div style={styles.info_content}>
                {
                    props.lloc ? <a href={`https://maps.google.com/?q=${encodeURIComponent(props.lloc)}`}>
                        {props.lloc}
                    </a> : <div>
                        A determinar (editeu la ubicació a Google Calendar)
                    </div>
                }
            </div></div>
        </div>
    );
}

export default Info;