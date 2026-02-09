const input = document.getElementById("input");
const output = document.getElementById("output");
const cleanBtn = document.getElementById("cleanBtn");
const copyBtn = document.getElementById("copyBtn");

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–|—/g, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .trim();
}

cleanBtn.addEventListener("click", () => {
  output.value = cleanText(input.value);
});

copyBtn.addEventListener("click", () => {
  output.select();
  document.execCommand("copy");
  copyBtn.textContent = "Copied!";
  setTimeout(() => {
    copyBtn.textContent = "Copy Clean Text";
  }, 1500);
});
window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});
