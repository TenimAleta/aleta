import { useEffect, useMemo, useState } from "react";
import EditableForm from "./EditableForm";
import { fetchAPI } from "../../../utils/utils";
import WelcomeUser from "./WelcomeUser";

function FillForm({ socket, userId, isLogged, castellersInfo, setCastellersInfo }) {
    const [formValues, setFormValues] = useState({});
    const [form, setForm] = useState(null);
    const [mote, setMote] = useState('');

    const evId = window.location.pathname.split('/')[2]
    const guestId = useMemo(() => Math.random().toString(36).substring(7), [])

    useEffect(() => {
        socket.emit('.load_form', evId)
        socket.emit('.is_form_submitted', userId !== -1 ? userId : guestId, evId)

        socket.on('.loaded_form', (data) => {
            setForm(data)
        })
        
        socket.on('.form_submitted', (res) => {
            if (res.user === (userId !== -1 ? userId : guestId) && res.success && res?.evId === evId) {
                setFormValues(res.response)
            }
        })

        socket.on('.form_deleted', () => {
            socket.emit('.is_form_submitted', userId !== -1 ? userId : guestId, evId)
        })

        return () => {
            socket.off('.form_submitted')
            socket.off('.form_deleted')
            socket.off('.loaded_form')
        }
    }, [evId, guestId, userId])

    useEffect(() => {
        if (isLogged) {
            setMote(castellersInfo?.[userId]?.mote || '')
        }
    }, [isLogged, userId, castellersInfo])

    return (
        <div
            className="container"
            style={{
                width: '100%',
            }}
        >
            {
                form === null ? (
                    <div>
                        Carregant...
                    </div>
                ) : !form?.new ? (
                    <>
                        {/* <WelcomeUser
                            isLogged={isLogged}
                            userId={userId}
                            castellersInfo={castellersInfo}
                        /> */}
                        <EditableForm
                            formSubmitted={false}
                            formData={form}
                            formValues={formValues}
                            setFormValues={setFormValues}
                            evId={evId}
                            user={userId !== -1 ? userId : guestId}
                            socket={socket}
                            mote={mote}
                            setMote={setMote}
                            castellersInfo={castellersInfo}
                            isLogged={isLogged}
                        />
                    </>
                ) : (
                    <div>
                        No hi ha formulari per aquest esdeveniment.
                    </div>
                )
            }
        </div>
    )
}

export default FillForm;