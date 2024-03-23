import { useState } from "react";
import { useEffect } from "react";
import Select from "react-select";
import { fetchAPI, getSubdomain } from "../../../utils/utils";

const displayName = info => (info?.canalla ? '👶 ' : '') + (info?.mote ? ` ${info?.mote}` : `${info?.nom} ${info?.cognom}`)
const COLLA = getSubdomain();

function NotificationGroupManager({ user_names, castellersInfo }) {
    const [groups, setGroups] = useState({});
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedGroupName, setSelectedGroupName] = useState('');
    const [showInput, setShowInput] = useState(false);
  
    const [showManager, setShowManager] = useState(false);

    // Fetch existing groups from the server
    useEffect(() => {
      fetchAPI('/notification_groups', setGroups);
    }, []);
  
    // Handlers for creating, editing, and deleting groups
    const createGroup = () => {
        // POST /notification_groups
        fetch(`https://${COLLA}-api.tenimaleta.com:4001/api/notification_groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', "x-api-key": "453dabb4-7645-4626-a1bb-477dff3aa557" },
            // body: JSON.stringify({ name: newGroupName, ids: selectedUsers.map(u => u.value) })
            body: JSON.stringify({ name: newGroupName, ids: [] })
        })
        .then(() => {
            console.log('Group created')
            fetchAPI('/notification_groups', setGroups);
        })
    };

    const editGroup = (name, ids) => {
        setSelectedGroupName(name);
        setSelectedUsers(ids.map(id => ({ value: id, label: user_names.find(un => un.value === id).label, color: 'black' })));
        setShowInput(prev => !prev);
    }

    const saveGroup = (name) => {
        setShowInput(false);

        // PUT /notification_groups/:name
        fetch(`https://${COLLA}-api.tenimaleta.com:4001/api/notification_groups/${name}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', "x-api-key": "453dabb4-7645-4626-a1bb-477dff3aa557" },
            body: JSON.stringify({ name: name, ids: selectedUsers.map(u => u.value) })
        })
        .then(() => {
            console.log('Group saved')
            fetchAPI('/notification_groups', setGroups);
        })
    }

    const deleteGroup = (name) => {
        const conf = window.confirm(`Segur que vols eliminar el grup: "${name}"?`)
        if (!conf) return;

        // DELETE /notification_groups/:name
        fetch(`https://${COLLA}-api.tenimaleta.com:4001/api/notification_groups/${name}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', "x-api-key": "453dabb4-7645-4626-a1bb-477dff3aa557" },
            body: JSON.stringify({ name: name })
        })
        .then(() => {
            console.log('Group deleted')
            fetchAPI('/notification_groups', setGroups);
        })
    }
  
    return !showManager ? (
        <button onClick={() => setShowManager(true)}>
            Edita els grups de notificacions
        </button>
    ) : (
      <div
        style={{
            backgroundColor: '#eee',
            padding: 20,
            borderRadius: 10,
        }}
      >
        <button onClick={() => setShowManager(false)}>
            Fet
        </button>

        <h2>Crea un nou grup</h2>
        <input placeholder="Nom del nou grup" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
        <button onClick={createGroup}>Crea un nou grup</button>
  
        <h2>Grups creats</h2>

        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                margin: 10,
            }}
        >
            {Object.values(groups).map(({ name, ids }) => (
            <div key={name}>
                <h3>{name}</h3>
                <p style={{ fontSize: 12 }}>{ids.map(id => displayName(castellersInfo[id])).join(', ')}</p>
                { !showInput && <button onClick={() => editGroup(name, ids)}>Edita</button> }
                { showInput && selectedGroupName === name && <button onClick={() => saveGroup(name)}>Guarda</button> }
                { showInput && selectedGroupName === name && <button onClick={() => setShowInput(false)}>Cancel·la</button> }
                { !showInput && <button onClick={() => deleteGroup(name)}>Borra</button> }
            </div>
            ))}

            {
                Object.values(groups).length === 0 && (
                    <p>No hi ha cap grup creat</p>
                )
            }
        </div>

        {
            showInput && (
                <Select
                    placeholder={`Edita el grup ${selectedGroupName}...`}
                    options={user_names.filter(u => !selectedUsers.map(su => su.value).includes(u.value))}
                    isMulti
                    name="users"
                    className="basic-multi-select"
                    classNamePrefix="select"
                    value={selectedUsers}
                    onChange={setSelectedUsers}
                />
            )
        }
      </div>
    );
  }

  export default NotificationGroupManager;