use pyo3::prelude::*;

#[pyclass]
struct SegmentTree {
    tree: Vec<f64>,
    n: usize,
}

#[pymethods]
impl SegmentTree {
    #[new]
    fn new(data: Vec<f64>) -> Self {
        let n = data.len();
        let mut tree = vec![0.0; 2 * n];
        for i in 0..n { tree[n + i] = data[i]; }
        for i in (1..n).rev() { tree[i] = tree[2 * i].max(tree[2 * i + 1]); }
        SegmentTree { tree, n }
    }

    fn query_max(&self, mut l: usize, mut r: usize) -> f64 {
        let mut res = f64::MIN;
        l += self.n; r += self.n;
        while l < r {
            if l % 2 == 1 { res = res.max(self.tree[l]); l += 1; }
            if r % 2 == 1 { r -= 1; res = res.max(self.tree[r]); }
            l /= 2; r /= 2;
        }
        res
    }
}

#[pymodule]
fn rust_engine(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<SegmentTree>()?;
    Ok(())
}
