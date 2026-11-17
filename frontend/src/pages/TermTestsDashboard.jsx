
import { useNavigate, useParams } from 'react-router-dom'
import './TermTestsDashboard.css'

function TermTestsDashboard() {
    const navigate = useNavigate()
    const { classId } = useParams()

const menuItems = [
    {
        title: 'Editing View',
        description: 'View individual student marks, totals, averages and performance.',
        icon: '♙',
        path: `/employee/term-tests/${classId}/students`
    },
    
    {
        title: 'Subject Analysis',
        description: 'Analyse subject performance, grade distribution and student rankings.',
        icon: '▥',
        path: `/employee/term-tests/${classId}/subject-analysis`
    },
    {
        title: 'Class Analysis',
        description: 'Explore class performance, rankings and statistical reports.',
        icon: '▦',
        path: `/employee/term-tests/${classId}/analysis`
    },
    {
        title: 'Subject Settings',
        description: 'Configure which subjects are included in class calculations.',
        icon: '⚙',
        path: `/employee/term-tests/${classId}/settings`
    }
]

    return (
        <div className="term-tests-dashboard">

            <header className="term-tests-header">
                <div>
                    <p>ACADEMIC MANAGEMENT</p>
                    <h1>Term Tests</h1>
                    <span>Class ID: {classId}</span>
                </div>

                <button
                    className="term-tests-back-btn"
                    onClick={() => navigate('/employee')}
                >
                    ← Back to Dashboard
                </button>
            </header>

            <section className="term-tests-welcome">
                <h2>Term Test Management</h2>
                <p>
                    Select an option below to manage marks and analyse
                    student performance for this class.
                </p>
            </section>

            <section className="term-tests-menu">

                {menuItems.map(item => (
                    <button
                        key={item.title}
                        className="term-tests-menu-card"
                        onClick={() => navigate(item.path)}
                    >
                        <div className="term-tests-menu-icon">
                            {item.icon}
                        </div>

                        <div className="term-tests-menu-info">
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                        </div>

                        <span className="term-tests-menu-arrow">
                            →
                        </span>
                    </button>
                ))}

            </section>

        </div>
    )
}

export default TermTestsDashboard
