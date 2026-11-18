
import { useState } from 'react'
import './StudentPromotion.css'

function StudentPromotion() {

        const [promotionGroup, setPromotionGroup] = useState('')
    const [promotionPreview, setPromotionPreview] = useState(null)
    const [promotionLoading, setPromotionLoading] = useState(false)
    const [promotionError, setPromotionError] = useState('')


        const handlePromotionPreview = async (group) => {
        setPromotionGroup(group)
        setPromotionPreview(null)
        setPromotionError('')
        setPromotionLoading(true)

        try {
            const response = await fetch(
                `http://localhost:5000/api/promotion/preview?group=${group}`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            )

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || 'Unable to generate promotion preview.'
                )
            }

            setPromotionPreview(result.preview)

        } catch (error) {
            console.error('Promotion preview error:', error)
            setPromotionError(error.message)

        } finally {
            setPromotionLoading(false)
        }
    }

    return (
      <div className="student-promotion system-management">
            <div className="teacher-section-heading">
                <div>
                    <h2>Student Promotion</h2>
                    <p>
                        Manage annual student promotions and class teacher
                        assignments.
                    </p>
                </div>
            </div>

            <div className="system-management-section">
    <h3>Promote Students</h3>

    <p>
        Select the student group you want to promote.
        You will be able to review all changes before confirming.
    </p>

    {promotionLoading && (
    <p className="promotion-loading">
        Generating promotion preview...
    </p>
)}

{promotionError && (
    <div className="promotion-error">
        {promotionError}
    </div>
)}

    <div className="system-management-cards">

        <div className="system-management-card">
            <h4>Grades 1–11</h4>

            <p>
                Promote students in Grades 1–11, including
                the applicable grade transitions and deletions.
            </p>

            <button
                type="button"
               onClick={() => handlePromotionPreview('1-11')}
            >
                Preview Grades 1–11
            </button>
        </div>

        <div className="system-management-card">
            <h4>Grades 12–13</h4>

            <p>
                Promote Grade 12 students to Grade 13 and
                remove completed or inactive students.
            </p>

            <button
                type="button"
                onClick={() => alert('Grades 12–13 selected')}
            >
                Preview Grades 12–13
            </button>
        </div>

    </div>

    {promotionPreview && (
    <div className="promotion-preview">

        <h3>Promotion Preview</h3>

        <p>
            {promotionGroup === '1-11'
                ? 'Grades 1–11'
                : 'Grades 12–13'}
        </p>

        <div className="promotion-preview-grid">

            <div className="promotion-preview-item">
                <span>Students to Promote</span>
                <strong>{promotionPreview.students_to_promote}</strong>
            </div>

            <div className="promotion-preview-item">
                <span>Students to Delete</span>
                <strong>{promotionPreview.students_to_delete}</strong>
            </div>

            <div className="promotion-preview-item">
                <span>Marks to Delete</span>
                <strong>{promotionPreview.marks_to_delete}</strong>
            </div>

            <div className="promotion-preview-item">
                <span>Classes to Create</span>
                <strong>{promotionPreview.classes_to_create}</strong>
            </div>

            <div className="promotion-preview-item">
                <span>Inactive Teachers to Delete</span>
                <strong>{promotionPreview.teachers_to_delete}</strong>
            </div>

            <div className="promotion-preview-item">
                <span>Login Sessions to Delete</span>
                <strong>{promotionPreview.sessions_to_delete}</strong>
            </div>

        </div>

        <p className="promotion-warning">
            No changes have been made yet. This is only a preview.
        </p>

    </div>
)}
</div>

        </div>
    )
}

export default StudentPromotion
