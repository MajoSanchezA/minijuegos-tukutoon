const colors = ["#ffe4e6", "#dbeafe", "#dcfce7"];
let index = 0;
document.getElementById("color").addEventListener("click", () => {
  document.body.style.backgroundColor = colors[index++ % colors.length];
});
