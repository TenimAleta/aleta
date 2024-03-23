import { useEffect, useState } from "react"
import { fetchAPI } from "../../utils/utils"

function ShareCalendar() {
    const [calendarURL, setCalendarURL] = useState(null)
    const [copyPressed, setCopyPressed] = useState(false)

    useEffect(() => {
        fetchAPI('/public_calendar', data => {
            if (data.calendarURL) {
                setCalendarURL(data.calendarURL)
            } else {
                setCalendarURL(null)
            }
        })
    }, [])

    const handleCopy = () => {
        navigator.clipboard.writeText(calendarURL)
        setCopyPressed(true)
        setTimeout(() => setCopyPressed(false), 3000)
    }

    return calendarURL && (
        <div>
            <h2>Comparteix els calendaris a la colla</h2>
            <p>Comparteix aquests enllaços als teus castellers per donar-los-hi accés als calendaris de la colla.</p>
            <p>Per importar els calendaris, hauran de clicar als enllaços amb <strong>ordinador</strong>.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <strong>Calendari públic</strong>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                    <input type="text" value={calendarURL} readOnly style={{ flexGrow: 1, backgroundColor: '#eee' }} />
                    <button onClick={handleCopy}>{copyPressed ? 'Copiat!' : 'Copiar enllaç'}</button>
                </div>
            </div>
        </div>
    )
}

export default ShareCalendar;