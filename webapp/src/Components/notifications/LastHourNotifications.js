import { useState } from "react"
import { useEffect } from "react"
import Select from 'react-select';

function invertDictionary(dict) {
    let inverted = {};
    for (let key in dict) {
        dict[key].forEach((item) => {
            if (item in inverted) {
                inverted[item].push(key);
            } else {
                inverted[item] = [key];
            }
        });
    }
    return inverted;
}

function LastHourNotifications({ socket, tecnica_names, user_names }) {
    const [responsables, setResponsables] = useState({})
    const invertedResponsables = invertDictionary(responsables)

    useEffect(() => {
        socket.emit(".request_responsables")

        socket.on(".responsables", (data) => {
            setResponsables(data)
        })

        return () => {
            socket.off(".responsables")
        }
    }, [])

    const handleChange = (list, action, responsable) => {
        if (action.action === "select-option") {
            socket.emit(".add_responsable", {
                tecnica: responsable,
                user: action.option.value
            })
        } else if (action.action === "remove-value") {
            socket.emit(".remove_responsable", {
                tecnica: responsable,
                user: action.removedValue.value
            })
        } else if (action.action === "clear") {
            socket.emit(".clear_responsables", {
                tecnica: responsable,
            })
        }
    }

    const posahiTothom = (tecnica) => {
        const users = user_names.map((user) => user.value)

        socket.emit(".add_responsables", {
            tecnica: tecnica,
            users: users
        })
    }

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h3>Gent que falta</h3>
                <div style={{ overflow: 'auto', height: 300, display: 'flex', flexWrap: 'wrap' }}>
                    {
                        user_names
                            .sort((a, b) => a.label.localeCompare(b.label))
                            .filter((user) => !(user.value in invertedResponsables) || invertedResponsables[user.value].length === 0)
                            .map((user) => <div style={{ margin: 2, padding: 5, backgroundColor: '#eee', borderRadius: 5 }} key={user.value}>{user.label}</div>)    
                    }
                </div>
            </div>

            {tecnica_names.map(name => {
                const usersOfResponsable = (responsables[name.value] || [])
                    .map((user) => user_names.find((u) => parseInt(u.value) === parseInt(user)))

                return (<div style={{ marginBottom: 25 }} key={name.value}>
                    <div
                        style={{
                            display: 'flex',
                            marginBottom: 10,
                        }}
                    >
                        <div
                            style={{
                                flex: 2,
                                fontSize: 18,
                                fontWeight: "bold",
                            }}
                        >
                            {name.label}
                        </div>
                        <div
                            style={{
                                flex: 1,
                                border: "1px solid #ccc",
                                color: "#ccc",
                                borderRadius: "5px",
                                textAlign: "center",
                                padding: "5px",
                                fontSize: 12
                            }}
                            onClick={() => posahiTothom(name.value)}
                        >
                            Posa-hi tothom
                        </div>
                    </div>
                    <Select
                        options={user_names}
                        isMulti
                        name="users"
                        className="basic-multi-select"
                        classNamePrefix="select"
                        value={usersOfResponsable}
                        onChange={(list, action) => handleChange(list, action, name.value)}
                        // styles={optionStyles}
                    />
                </div>)
            })}
        </div>
    )
}

export default LastHourNotifications;