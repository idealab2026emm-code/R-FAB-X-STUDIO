async function getDetails() {
  const code = document.getElementById("item_code").value;
  const result = document.getElementById("result");

  const res = await fetch(`http://localhost:5000/materials/${code}`);

  if (!res.ok) {
    result.innerHTML = "<p style='color:red;'>Material Not Found</p>";
    return;
  }

  const mat = await res.json();

  result.innerHTML = `
    <h3>${mat.item_name}</h3>
    <p><b>Item Code:</b> ${mat.item_code}</p>
    <p><b>Total Qty:</b> ${mat.total_qty}</p>
    <p><b>Available Qty:</b> ${mat.available_qty}</p>
  `;
}
