const ul = document.querySelector('#tasks'), msg = document.querySelector('#msg');
async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw Error(data.details ? Object.values(data.details).join(', ') : data.error || 'Request failed');
  return data;
}
const headers = { 'Content-Type': 'application/json' };
async function save(task, changes) {
  try {
    await api('/tasks/' + task._id, { method: 'PUT', headers, body: JSON.stringify(changes) });
    msg.textContent = '';
    await load();
  } catch (err) { msg.textContent = err.message; }
}
async function load() {
  try {
    const tasks = await api('/tasks');
    ul.replaceChildren();
    tasks.forEach(task => {
      const li = document.createElement('li');
      if (task.completed) li.className = 'done';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.checked = task.completed;
      checkbox.onchange = () => save(task, { completed: checkbox.checked });
      const id = document.createElement('span'); id.className = 'num';
      id.textContent = '#' + task._id.slice(-4);
      const title = document.createElement('span'); title.className = 'label';
      title.textContent = task.title + ' · ' + task.priority;
      const edit = document.createElement('button'); edit.className = 'action';
      edit.title = 'Edit task'; edit.textContent = '✎';
      edit.onclick = () => {
        const title = prompt('Edit task title', task.title);
        if (title !== null) save(task, { title });
      };
      const del = document.createElement('button'); del.className = 'action';
      del.title = 'Delete task'; del.textContent = '×';
      del.onclick = async () => {
        try { await api('/tasks/' + task._id, { method: 'DELETE' }); msg.textContent = ''; await load(); }
        catch (err) { msg.textContent = err.message; }
      };
      li.append(checkbox, id, title, edit, del); ul.append(li);
    });
    document.querySelector('#count').textContent = tasks.filter(task => task.completed).length + ' of ' + tasks.length + ' completed';
  } catch (err) { msg.textContent = err.message; }
}
document.querySelector('#form').onsubmit = async event => {
  event.preventDefault();
  const input = document.querySelector('#title');
  try {
    await api('/tasks', { method: 'POST', headers, body: JSON.stringify({ title: input.value, priority: 'medium' }) });
    input.value = ''; msg.textContent = ''; await load();
  } catch (err) { msg.textContent = err.message; }
};
load();
