function e(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    Object.keys(attributes).forEach(key => element.setAttribute(key, attributes[key]));
    children.forEach((child) => {
        if (typeof child === "string") {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    return element;
}

function addSongCard(song, className, parent) {
    const card = e("div", { class: className }, e("p", {}, song.title));
    parent.appendChild(card);
}