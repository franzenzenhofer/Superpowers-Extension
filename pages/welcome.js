document.addEventListener('DOMContentLoaded', () => {
  // Handle both sets of buttons (quick access and bottom)
  ['openSidePanel', 'quickOpenSidePanel'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
    });
  });

  ['openCredsManager', 'quickOpenCredsManager'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: "OPEN_CREDENTIALS_MANAGER" });
    });
  });

  // Make all external links open in new tabs
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('chrome-extension://') && !href.startsWith('#')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Add copy functionality to code blocks
  document.querySelectorAll('.mini-box').forEach(box => {
    const code = box.querySelector('code');
    if (code) {
      const copyButton = document.createElement('button');
      copyButton.className = 'btn-secondary';
      copyButton.style.float = 'right';
      copyButton.style.margin = '0.5em';
      copyButton.textContent = 'Copy';
      
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent);
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
      
      box.insertBefore(copyButton, box.firstChild);
    }
  });

  // Add Chrome Extensions URL copy functionality
  document.getElementById('copyExtensionsUrl')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('chrome://extensions');
      const btn = document.getElementById('copyExtensionsUrl');
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  });

  // Initialize any Superpowers functionality if needed
  const initSuperpowers = async () => {
    try {
      // Wait for Superpowers to be injected
      await new Promise(r => setTimeout(r, 300));
      
      if (window.Superpowers) {
        console.log('Superpowers initialized successfully');
      }
    } catch (err) {
      console.error('Error initializing Superpowers:', err);
    }
  };

  initSuperpowers();
});
