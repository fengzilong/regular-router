export { insertAfter };

function insertAfter(node, refer) {
  const next = refer.nextSibling;

  if (next) {
    next.parentNode.insertBefore(node, next);
  } else {
    refer.parentNode.appendChild(node);
  }
}
