# Safety check

<script>window.__plainviewXss = true</script>

<img src="x" onerror="window.__plainviewXss = true">

[bad link](javascript:alert('xss'))

<div onclick="window.__plainviewXss = true">raw html stays text</div>
