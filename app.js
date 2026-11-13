const WHATSAPP_NUMBER = '5492344403750';
const products = [
  {id:'ajo',name:'Ajo en polvo',category:'condimentos',label:'Condimentos',image:'assets/ajo-en-polvo.jpg',description:'Condimento para tus preparaciones.',meta:'Por kilo o ½ kg'},
  {id:'cebolla',name:'Cebolla en escamas',category:'condimentos',label:'Condimentos',image:'assets/cebolla-en-escamas.jpg',description:'Ideal para sumar sabor a tus comidas.',meta:'Por kilo o ½ kg'},
  {id:'perejil',name:'Perejil deshidratado',category:'condimentos',label:'Condimentos',image:'assets/perejil-deshidratado.jpg',description:'Práctico para tener siempre a mano.',meta:'Por kilo o ½ kg'},
  {id:'provenzal',name:'Provenzal',category:'condimentos',label:'Condimentos',image:'assets/provenzal.jpg',description:'Mezcla de perejil y ajo chino.',meta:'Por kilo o ½ kg'},
  {id:'oregano',name:'Orégano',category:'condimentos',label:'Condimentos',image:'assets/oregano.jpg',description:'Un clásico para la cocina.',meta:'Por kilo o ½ kg'},
  {id:'adobo',name:'Adobo para pizza',category:'condimentos',label:'Condimentos',image:'assets/adobo-para-pizza.jpg',description:'Mezcla para dar sabor a tus pizzas.',meta:'Por kilo o ½ kg'},
  {id:'pimenton',name:'Pimentón y chimichurri',category:'condimentos',label:'Condimentos',image:'assets/pimenton-y-chimichurri.jpg',description:'Consultá por estas variedades.',meta:'Por kilo o ½ kg'},
  {id:'espejos',name:'Espejos con y sin LED',category:'espejos',label:'Espejos',image:'assets/espejo-led-vertical.jpg',description:'Diferentes modelos. Se realizan solamente por encargo.',meta:'Por encargo · seña según artículo'},
  {id:'espejos-varios',name:'Modelos de espejos LED',category:'espejos',label:'Espejos',image:'assets/espejos-led-varios.jpg',description:'Consultá por tamaños, colores y modelos disponibles.',meta:'Por encargo'},
  {id:'espejos-modelos',name:'Espejos LED — otros modelos',category:'espejos',label:'Espejos',image:'assets/espejos-led-modelos.jpg',description:'Escribinos para consultar por el modelo que te interesa.',meta:'Por encargo'},
  {id:'mini-aire',name:'Mini aire portátil',category:'hogar',label:'Hogar y varios',image:'assets/mini-aire-portatil.jpg',description:'Equipo portátil de refrigeración personal.',meta:'Consultar precio y disponibilidad'},
  {id:'mini-aire-auto',name:'Mini aire para auto',category:'hogar',label:'Hogar y varios',image:'assets/mini-aire-auto.jpg',description:'Artículo compacto para usar en el vehículo.',meta:'Consultar precio y disponibilidad'},
  {id:'ventilador',name:'Ventilador de pie 18 pulgadas',category:'hogar',label:'Hogar y varios',image:'assets/ventilador-de-pie.jpg',description:'Consultá por este modelo y disponibilidad.',meta:'Consultar precio y disponibilidad'},
  {id:'cortador',name:'Cortador y rallador de verduras',category:'hogar',label:'Hogar y varios',image:'assets/cortador-rallador-verduras.jpg',description:'Accesorio de cocina con diferentes cuchillas.',meta:'Consultar precio y disponibilidad'},
  {id:'masajeador',name:'Mini masajeador',category:'belleza',label:'Belleza y cuidado',image:'assets/mini-masajeador.jpg',description:'Consultá por este artículo de cuidado personal.',meta:'Consultar precio y disponibilidad'},
  {id:'cepillo',name:'Cepillo autolimpiante para mascotas',category:'hogar',label:'Hogar y varios',image:'assets/cepillo-mascotas.jpg',description:'Cepillo para el cuidado del pelo de las mascotas.',meta:'Consultar precio y disponibilidad'},
  {id:'depiladora',name:'Depiladora y perfilador 2 en 1',category:'belleza',label:'Belleza y cuidado',image:'assets/depiladora-perfilador.jpg',description:'Artículo de cuidado personal a batería.',meta:'Consultar precio y disponibilidad'},
  {id:'aro-luz',name:'Aro de luz LED RGB',category:'tecnologia',label:'Accesorios',image:'assets/aro-luz-rgb.jpg',description:'Iluminación LED con colores RGB.',meta:'Consultar precio y disponibilidad'},
  {id:'auriculares',name:'Auriculares',category:'tecnologia',label:'Accesorios',image:'assets/auriculares.jpg',description:'Consultá por este modelo.',meta:'Consultar precio y disponibilidad'},
  {id:'cinta',name:'Cinta métrica',category:'hogar',label:'Hogar y varios',image:'assets/cinta-metrica.jpg',description:'Herramienta de medición. Consultá por medidas.',meta:'Consultar precio y disponibilidad'},
  {id:'cutter',name:'Cutter / trincheta',category:'hogar',label:'Hogar y varios',image:'assets/cutter.jpg',description:'Herramienta de corte. Consultá por modelos.',meta:'Consultar precio y disponibilidad'}
];

const grid = document.getElementById('product-grid');
const search = document.getElementById('search');
const empty = document.getElementById('empty-state');
const productLabel = document.querySelector('label[for="product-select"]');
const oldSelect = document.getElementById('product-select');
const oldQuantityLabel = document.querySelector('label[for="quantity"]');
const oldQuantity = document.getElementById('quantity');

const productItems = document.createElement('div');
productItems.id = 'product-items';
productItems.style.display = 'grid';
productItems.style.gap = '10px';

oldSelect.remove();
oldQuantityLabel.remove();
oldQuantity.remove();

productLabel.textContent = 'Productos de interés';
productLabel.removeAttribute('for');
productLabel.insertAdjacentElement('afterend', productItems);

const addButton = document.createElement('button');
addButton.type = 'button';
addButton.textContent = '+ Agregar otro producto';
addButton.style.width = '100%';
addButton.style.padding = '12px';
addButton.style.marginBottom = '12px';
addButton.style.border = '1px dashed currentColor';
addButton.style.borderRadius = '10px';
addButton.style.background = 'transparent';
addButton.style.color = 'inherit';
addButton.style.cursor = 'pointer';

productItems.insertAdjacentElement('afterend', addButton);

function addProductRow(selectedId = '') {
  const row = document.createElement('div');
  row.className = 'product-row';
  row.style.display = 'grid';
  row.style.gridTemplateColumns = 'minmax(0,1fr) minmax(90px,115px) 38px';
  row.style.gap = '8px';
  row.style.alignItems = 'center';

  const productSelect = document.createElement('select');
  productSelect.name = 'product[]';
  productSelect.required = true;
  productSelect.style.width = '100%';
  productSelect.style.minWidth = '0';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Seleccioná un producto';
  productSelect.appendChild(placeholder);

  products.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    productSelect.appendChild(option);
  });

  productSelect.value = selectedId;

  const quantity = document.createElement('input');
  quantity.type = 'text';
  quantity.name = 'quantity[]';
  quantity.placeholder = 'Cantidad';
  quantity.required = true;
  quantity.style.width = '100%';
  quantity.style.minWidth = '0';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.textContent = '×';
  removeButton.title = 'Quitar producto';
  removeButton.style.width = '38px';
  removeButton.style.height = '42px';
  removeButton.style.borderRadius = '8px';
  removeButton.style.cursor = 'pointer';

  row.append(productSelect, quantity, removeButton);
  productItems.appendChild(row);

  removeButton.addEventListener('click', () => {
    if (productItems.children.length > 1) {
      row.remove();
    } else {
      productSelect.value = '';
      quantity.value = '';
    }
  });

  return row;
}

addButton.addEventListener('click', () => addProductRow());
addProductRow();

let activeFilter = 'todos';

function renderProducts(){
  const term = search.value.trim().toLocaleLowerCase('es');
  const visible = products.filter(p =>
    (activeFilter === 'todos' || p.category === activeFilter) &&
    `${p.name} ${p.description} ${p.label}`.toLocaleLowerCase('es').includes(term)
  );

  grid.innerHTML = visible.map(p => `
    <article class="product-card">
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="product-category">${p.label}</span>
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="product-meta">${p.meta}</div>
        <button type="button" data-product="${p.id}">Consultar este producto ↗</button>
      </div>
    </article>`).join('');

  empty.hidden = visible.length > 0;

  grid.querySelectorAll('[data-product]').forEach(button =>
    button.addEventListener('click', () => {
      const emptyRow = [...productItems.querySelectorAll('.product-row')]
        .find(row => !row.querySelector('select').value);

      const targetRow = emptyRow || addProductRow();
      targetRow.querySelector('select').value = button.dataset.product;

      document.getElementById('como-comprar')
        ?.scrollIntoView({behavior:'smooth',block:'start'});

      document.getElementById('customer-name').focus({preventScroll:true});
    })
  );
}

document.getElementById('filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;

  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter')
    .forEach(el => el.classList.toggle('active', el === button));

  renderProducts();
});

search.addEventListener('input', renderProducts);
document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('inquiry-form').addEventListener('submit', event => {
  event.preventDefault();

  const name = document.getElementById('customer-name').value.trim();
  const extra = document.getElementById('extra').value.trim();

  const items = [...productItems.querySelectorAll('.product-row')].map(row => ({
    product: products.find(p => p.id === row.querySelector('select').value),
    quantity: row.querySelector('input').value.trim()
  }));

  if (!name || !items.length ||
      items.some(item => !item.product || !item.quantity)) return;

  const list = items.map(item =>
    `• ${item.quantity} x ${item.product.name}`
  ).join('\n');

  const message = `Hola, soy ${name}. Quiero consultar por:\n${list}.${extra ? ` Detalles: ${extra}.` : ''} ¿Me pueden confirmar precio vigente y disponibilidad? Gracias.`;

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener'
  );
});

renderProducts();
