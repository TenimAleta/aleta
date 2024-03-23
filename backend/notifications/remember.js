module.exports.remember = (execute_query, sendPushNotification) => {
    const get_users_w_notis = () => `SELECT * FROM castellers WHERE expo_push_token IS NOT NULL`;
    const get_future_events_w_assistance = (user) => `select e.*, a.* from events e LEFT JOIN assistència a ON e.id=a.\`event-id\` AND a.\`casteller-id\`=${user} WHERE \`data-esperada-inici\` < '2099-12-29' AND \`data-esperada-inici\` >= NOW()`;
    const moment = require('moment');

    const credentials = JSON.parse(fs.readFileSync('../../db.credentials.json'));

    const applyTimeZone = (date, tz='Spain') => {
        if (tz === 'Spain') {
            const mom = moment(date)
            const lastSundayOfThisYearsMarch = mom.clone().year(mom.clone().year()).month(2).endOf('month').day('Sunday');
            const lastSundayOfThisYearsOctober = mom.clone().year(mom.clone().year()).month(9).endOf('month').day('Sunday');
    
            if (mom < lastSundayOfThisYearsMarch) {
                // January - March: Winter time
                return mom.add(-1, 'hours');
            } else if (mom < lastSundayOfThisYearsOctober) {
                // April - October: Summer time
                return mom.add(-2, 'hours');
            } else {
                // November - December: Winter time
                return mom.add(-1, 'hours');
            }
        } else {
            return moment(date);
        }
    }

    const is_user_in_targets = (event, user) => {
        const targets = event.targets ? event.targets.split(',') : []
        
        return targets.every(target => {
            return (target === 'músics' && parseInt(user.music) > 0) ||
                   (target === 'junta' && parseInt(user.es_junta) > 0) ||
                   (target === 'tècnica' && parseInt(user.es_tecnica) > 0)
        })
    }

    // Send a notification to remember {user} to confirm {event}
    const remember_event = (user, event) => {
        const dateId = d => [d.getDate(), d.getMonth(), d.getFullYear()].join('-');
        const userName = user.mote || user.nom;

        const todayDate = new Date();
        const eventDate = applyTimeZone(event['data-esperada-inici']).toDate()

        const todayMoment = moment([todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()]);
        const eventMoment = moment([eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()]);

        const daysFromToday = eventMoment.diff(todayMoment, 'days');
        const daysFromTodayText = daysFromToday === 0 ? 'avui' : daysFromToday === 1 ? 'demà' : `en ${daysFromToday} dies`; 

        sendPushNotification({
            to: user.expo_push_token,
            sound: 'default',
            title: `${daysFromToday < 2 ? daysFromTodayText.toUpperCase() + ' - ' : ''}${event.title}`,
            body: `${userName}, comptem amb tu per l'${event.title} (${daysFromTodayText})? Comunica'ns-ho ara.`,
            data: { "selectedDay": dateId(applyTimeZone(event['data-esperada-inici'])).toDate(), "user": user, "colla": credentials['colla'] },
        },
        /*save=*/false)
    }

    // Remember near (7 days assaig, 30 days actuació) non-confirmated events
    const remember_no_confs = user => execute_query(get_future_events_w_assistance(user.id), data => {
        const decodedData = data.map(ev => {
            const decoded_title = ev.title ? Buffer.from(ev.title, 'base64').toString('utf-8') : ''
            const decoded_description = ev.description ? Buffer.from(ev.description, 'base64').toString('utf-8') : ''

            return {
                ...ev,
                ['title']: decoded_title,
                ['description']: decoded_description,
            }
        })

        const no_confirmats = decodedData.filter(ev => ev['assistència'] === null);

        const assaigs_no_conf = no_confirmats.filter(ev => ev.tipus === 'assaig');
        const actuacions_no_conf = no_confirmats.filter(ev => ev.tipus === 'actuació');

        const isDateNear = (date1, date2, threshold) => Math.abs(date1 - date2)/1000/60/60/24 < threshold; // threshold in days
        const assaigs_no_conf_propers = assaigs_no_conf.filter(as => isDateNear(new Date(), applyTimeZone(as['data-esperada-inici']).toDate(), 7))
        const actuacions_no_conf_propers = actuacions_no_conf.filter(as => isDateNear(new Date(), applyTimeZone(as['data-esperada-inici']).toDate(), 30))

        // Remember all near events
        const events_no_conf_propers = [...assaigs_no_conf_propers, ...actuacions_no_conf_propers];
        events_no_conf_propers.forEach(event => is_user_in_targets(event, user) && remember_event(user, event))
    })

    // Remember unconfirmed events to all users with active notifications
    const remember_no_confirmats = () => execute_query(
        get_users_w_notis(),
        users => users.forEach(user => remember_no_confs(user))
    );

    // Run main function
    return remember_no_confirmats();
};