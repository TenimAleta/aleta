import { useEffect, useState } from 'react';
import { loginUser, isLoggedIn } from '../../utils/login';
import { fetchAPI, getSubdomain } from '../../utils/utils';
import { NoSignal } from '../Interface';

const COLLA = getSubdomain();

function UserSelect({ socket, setUserId }) {
    const [userData, setUserData] = useState(null);
    const getName = data => `${data.nom} ${data.cognom}` + (data.mote ? ` (${data.mote})` : '')
    const searchableName = data => `${data.mote} ${data.nom} ${data.cognom}`
    const stringNormalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    useEffect(() => {
        fetchAPI('/castellersInfo', setUserData);
        socket.on('connect_error', () => setUserData(false));

        return () => {
            socket.off('connect_error');
        };
    }, []);

    const users = Object.values(userData || {})
        .filter(user => user.es_tecnica || user.es_junta)
        .map(({ id, nom, cognom, mote }) => ({ id, nom, cognom, mote }))

    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(true);

    const handleUserSelection = (user) => {
        setUserId(user.id);
        setSearchTerm(getName(user));
        setShowDropdown(false);
    };

    const clearSearchTerm = () => {
        setUserId(null);
        setSearchTerm('');
        setShowDropdown(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && filteredUsers.length > 0) {
            handleUserSelection(filteredUsers[0]);
        } else if (e.key === 'Backspace') {
            clearSearchTerm();
        }
    };

    const getFilteredUsers = (search) => {
        let tempSearchTerm = search;
        let tempFilteredUsers = [];
    
        while (tempSearchTerm.length > 0) {
            tempFilteredUsers = users.filter(user =>
                stringNormalize(searchableName(user)).toLowerCase().includes(tempSearchTerm.toLowerCase())
            );
    
            if (tempFilteredUsers.length > 0) {
                break;
            }
    
            tempSearchTerm = tempSearchTerm.slice(0, -1);
        }
    
        return tempFilteredUsers;
    };
    
    const filteredUsers = searchTerm ? getFilteredUsers(searchTerm) : users;
    
        return (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input
                    value={searchTerm}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowDropdown(true)}
                    // onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Busca't a la llista de tècnica"
                    style={{
                        width: '80%',
                        padding: '12px 20px',
                        margin: '8px 0',
                        display: 'inline-block',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                        fontSize: '16px',
                    }}
                />
                {filteredUsers.length > 0 && showDropdown && (
                    <div
                        style={{
                            width: '80%',
                            maxHeight: '200px',
                            overflowY: 'scroll',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            fontSize: '16px',
                        }}
                    >
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                onClick={() => handleUserSelection(user)}
                                style={{
                                    padding: '12px 20px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #ccc',
                                    backgroundColor: 'white',
                                    fontSize: '16px',
                                }}
                            >
                                {stringNormalize(getName(user))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
}

function Warning({ message }) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '10px 0',
            }}
        >
            <div
                style={{
                    padding: '15px',
                    backgroundColor: 'rgba(255, 0, 0, 0.5)',
                    color: 'white',
                    borderRadius: 5,
                    width: '75%',
                }}
            >
                {message}
            </div>
        </div>
    );
}

function Loading() {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '10px 0',
            }}
        >
            <div
                style={{
                    padding: '15px',
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    color: 'white',
                    borderRadius: 5,
                    width: '75%',
                }}
            >
                Entrant...
            </div>
        </div>
    );
}

function LoginApp({ isLogged, setIsLogged, socket, ...props }) {
    const [userId, setUserId] = useState(null);
    const [password, setPassword] = useState(null);
    const [isButtonPressed, setIsButtonPressed] = useState(false);
    const [wrongCredentials, setWrongCredentials] = useState(false);
    const [loading, setLoading] = useState(false);

    const login = (user, password) => {
        if (!user || !password) return;
        setLoading(true);

        loginUser(user, password)
            .then(correctCredentials => {
                setLoading(false)

                if (correctCredentials) {
                    setIsLogged(true);
                    props.setUserId(user)
                } else {
                    setWrongCredentials(true)
                }
            })
            .catch(() => {
                setLoading(false)
                setIsLogged(false)
                setWrongCredentials(true)
            })
    }

    useEffect(() => {
        if (loading) setWrongCredentials(false)
    }, [loading])

    useEffect(() => {
        setWrongCredentials(false)
    }, [userId])

    return (<>
        <NoSignal socket={socket} />

        <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            textAlign: 'center',
            padding: '20px',
        }}>
            <img
                src={`/escuts/${COLLA}.png`}
                alt="Escut de la colla"
                style={{
                    borderRadius: 10,
                    width: '50%',
                    minWidth: 100,
                    minHeight: 100,
                }}
            />

            <p>Has d'entrar com a tècnica o junta.</p>

            { wrongCredentials && <Warning message="La contrasenya és incorrecta." /> }
            { loading && <Loading /> }

            <UserSelect socket={socket} setUserId={setUserId} />

            {
                userId && (
                    <>
                        <input
                            type="password"
                            placeholder="Contrasenya"
                            onChange={e => setPassword(e.target.value)}
                            style={{
                                width: '80%',
                                padding: '12px 20px',
                                margin: '8px 0',
                                display: 'inline-block',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                                fontSize: '16px',
                            }}
                            onKeyUp={e => {
                                if (e.key === 'Enter') {
                                    login(userId, password)
                                }
                            }}
                        />
                        <button
                            onClick={() => login(userId, password)}
                            onPointerDown={() => setIsButtonPressed(true)}
                            onPointerUp={() => setIsButtonPressed(false)}
                            onPointerLeave={() => setIsButtonPressed(false)}
                            style={{
                                width: '80%',
                                backgroundColor: isButtonPressed ? '#3B9C41' : '#4CAF50',
                                color: 'white',
                                padding: '14px 20px',
                                margin: '8px 0',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px',
                            }}
                        >
                            Entrar
                        </button>
                    </>
                )
            }
        </div>
    </>)
}

export default LoginApp;