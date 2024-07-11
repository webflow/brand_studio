document.addEventListener('DOMContentLoaded', function() {

function updatePrices(toggleId, priceSelector, billingPeriodSelector) {
    const toggle = document.getElementById(toggleId);
    const priceDisplays = document.querySelectorAll(priceSelector);
    const billingPeriodDisplays = document.querySelectorAll(billingPeriodSelector);
  
    toggle.addEventListener('change', function () {
      // Update prices
      priceDisplays.forEach(priceElement => {
        const monthlyPrice = parseInt(priceElement.getAttribute('data-monthly-price'), 10);
        const yearlyPrice = parseInt(priceElement.getAttribute('data-yearly-price'), 10);
        priceElement.textContent = toggle.checked ? yearlyPrice : monthlyPrice;
      });
  
      // Update billing period text based on data attributes
      billingPeriodDisplays.forEach(billingElement => {
        const monthlyBillingText = billingElement.getAttribute('data-billing-monthly');
        const yearlyBillingText = billingElement.getAttribute('data-billing-yearly');
        billingElement.textContent = toggle.checked ? yearlyBillingText : monthlyBillingText;
      });
    });
  
    // Trigger an initial update at page load
    toggle.dispatchEvent(new Event('change'));
  }
  
  // Initialize each set of general pricing plans with their specific toggles
  updatePrices('sp-general-toggle', '.pricing-card .price', '[data-billing_period="true"]');
  updatePrices('sp-ecommerce-toggle', '.pricing-card .price', '[data-billing_period="true"]');
  updatePrices('wp-iht-toggle', '.pricing-card .price', '[data-billing_period="true"]');
  updatePrices('wp-fa-toggle', '.pricing-card .price', '[data-billing_period="true"]');
  
  // Function to update the price based on selected options for #business
  function updateBusinessPrice() {
    const priceElement = document.querySelector('#business .price');
    const toggle = document.getElementById('sp-general-toggle');
    const isChecked = toggle.checked;
  
    const cmsItemsSelect = document.getElementById('business-cms_items');
    const bandwidthSelect = document.getElementById('business-bandwidth');
  
    const initialPrice = isChecked ?
      parseInt(priceElement.getAttribute('data-initial-yearly-price'), 10) :
      parseInt(priceElement.getAttribute('data-initial-monthly-price'), 10);
  
    const cmsItemsPrice = isChecked ?
      parseInt(cmsItemsSelect.options[cmsItemsSelect.selectedIndex].getAttribute('data-yearly-price'),
        10) :
      parseInt(cmsItemsSelect.options[cmsItemsSelect.selectedIndex].getAttribute(
        'data-monthly-price'), 10);
    const bandwidthPrice = isChecked ?
      parseInt(bandwidthSelect.options[bandwidthSelect.selectedIndex].getAttribute(
        'data-yearly-price'), 10) :
      parseInt(bandwidthSelect.options[bandwidthSelect.selectedIndex].getAttribute(
        'data-monthly-price'), 10);
  
    const totalPrice = initialPrice + cmsItemsPrice + bandwidthPrice;
    priceElement.textContent = totalPrice;
  
  }
  
  // Initialize the initial price attribute for #business
  function initializeBusinessInitialPrice() {
    const priceElement = document.querySelector('#business .price');
    if (!priceElement.getAttribute('data-initial-monthly-price')) {
      priceElement.setAttribute('data-initial-monthly-price', priceElement.getAttribute(
        'data-monthly-price'));
    }
    if (!priceElement.getAttribute('data-initial-yearly-price')) {
      priceElement.setAttribute('data-initial-yearly-price', priceElement.getAttribute(
        'data-yearly-price'));
    }
  }
  
  // Attach event listeners to select fields and the toggle checkbox for #business
  function attachBusinessPriceUpdateListeners() {
    document.getElementById('business-cms_items').addEventListener('change', updateBusinessPrice);
    document.getElementById('business-bandwidth').addEventListener('change', updateBusinessPrice);
    document.getElementById('sp-general-toggle').addEventListener('change', updateBusinessPrice);
  }
  
  // Initialize the initial price for #business and update the price
  initializeBusinessInitialPrice();
  attachBusinessPriceUpdateListeners();
  
  // Trigger initial update to set the correct state
  updateBusinessPrice();
  
});
